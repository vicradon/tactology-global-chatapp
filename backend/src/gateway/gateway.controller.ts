import { OnModuleInit, UseGuards, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { unsign } from 'cookie-signature';
import { Server, Socket } from 'socket.io';
import { jwtConstants } from 'src/auth/constants';
import { WsAuthGuard } from './gateway.auth.guard';
import { GatewayService } from './gateway.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '../rooms/entities/room.entity';
import { RoomService } from '../rooms/room.service'; // Import RoomService
import * as dotenv from 'dotenv';
dotenv.config();

type NewMessageDto = {
  username: string;
  message: string;
  timestamp?: string;
  roomId?: string;
};

interface OnlineUser {
  username: string;
  socketId: string;
  lastActive: Date;
  userId: number; // Add userId to track users
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3200'],
    credentials: true,
  },
})
export class MyGateway implements OnModuleInit, OnGatewayDisconnect {
  private onlineUsers: Map<number, OnlineUser> = new Map();
  // Track which rooms each socket is in
  private userRooms: Map<string, Set<string>> = new Map();

  constructor(
    private jwtService: JwtService,
    private gatewayService: GatewayService,
    private roomService: RoomService, // Inject RoomService
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
  ) {}

  @WebSocketServer()
  server: Server;

  async onModuleInit() {
    this.server.use(this.createAuthMiddleware());
    this.server.on('connection', async (socket) => {
      console.log(socket.id);
      console.log('Connected');

      try {
        const userId = socket.data.user.sub;
        const username = socket.data.user.username;

        this.addOnlineUser(userId, username, socket.id);
        this.broadcastOnlineUsers();

        // Initialize empty Set for tracking rooms this socket is in
        this.userRooms.set(socket.id, new Set());

        const generalRoom = await this.roomRepository.findOne({
          where: { name: 'general' },
        });

        if (generalRoom) {
          // Persist user joining the general room in the database
          try {
            await this.roomService.joinRoom(generalRoom.id, userId);
            console.log(`User ${username} joined general room in database`);
          } catch (error) {
            // User might already be a member - that's OK
            if (
              !(
                error instanceof Error &&
                error.message.includes('already a member')
              )
            ) {
              console.error('Error adding user to general room:', error);
            }
          }

          socket.join(generalRoom.id);
          // Track that this user joined the general room
          this.addUserToRoom(socket.id, generalRoom.id);

          const messages = await this.gatewayService.getMessagesByRoom(
            generalRoom.id,
          );
          socket.emit('roomPreviousMessages', messages);

          socket.to(generalRoom.id).emit('userJoinedRoom', {
            username: socket.data.user.username,
            roomId: generalRoom.id,
          });
        } else {
          // Empty array since user isn't in any room yet
          socket.emit('roomPreviousMessages', []);
        }

        this.server.emit('newUserJoined', 'a new user joined');
      } catch (error) {
        console.error('Error in connection handler:', error);
        // Return empty array if there's an error - don't expose all messages
        socket.emit('roomPreviousMessages', []);
      }
    });
  }

  handleDisconnect(socket: Socket) {
    try {
      if (socket.data?.user?.sub) {
        // When user disconnects, we don't remove them from rooms in the database
        // They should remain members until they explicitly leave
        this.removeOnlineUser(socket.data.user.sub);
        this.broadcastOnlineUsers();
      }
      // Clean up user room tracking
      this.userRooms.delete(socket.id);
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }

  async onGatewayDisconnect(socket: Socket) {
    this.handleDisconnect(socket);
  }

  // Track which rooms a user has joined
  private addUserToRoom(socketId: string, roomId: string) {
    const userRoomSet = this.userRooms.get(socketId) || new Set();
    userRoomSet.add(roomId);
    this.userRooms.set(socketId, userRoomSet);
  }

  // Remove a room from a user's joined rooms
  private removeUserFromRoom(socketId: string, roomId: string) {
    const userRoomSet = this.userRooms.get(socketId);
    if (userRoomSet) {
      userRoomSet.delete(roomId);
    }
  }

  // Check if a user is in a specific room
  private isUserInRoom(socketId: string, roomId: string): boolean {
    const userRoomSet = this.userRooms.get(socketId);
    return userRoomSet ? userRoomSet.has(roomId) : false;
  }

  private addOnlineUser(userId: number, username: string, socketId: string) {
    this.onlineUsers.set(userId, {
      username,
      socketId,
      lastActive: new Date(),
      userId, // Store the userId
    });
  }

  private removeOnlineUser(userId: number) {
    this.onlineUsers.delete(userId);
  }

  private updateUserActivity(userId: number) {
    const user = this.onlineUsers.get(userId);
    if (user) {
      user.lastActive = new Date();
    }
  }

  private getOnlineUsers(): OnlineUser[] {
    return Array.from(this.onlineUsers.values());
  }

  private broadcastOnlineUsers() {
    const onlineUsers = this.getOnlineUsers();
    this.server.emit('onlineUsersUpdate', onlineUsers);
  }

  private createAuthMiddleware() {
    return async (socket: Socket, next) => {
      try {
        const cookieString = socket.handshake.headers.cookie || '';
        const cookies = this.parseCookies(cookieString);

        const signedCookie = decodeURIComponent(cookies?.['accessToken']);

        if (!signedCookie) {
          return next(new Error('Authentication error'));
        }

        let token;
        if (signedCookie.startsWith('s')) {
          const value = signedCookie.slice(2);
          token = unsign(value, process.env.COOKIE_SIGNING_KEY);
          if (!token) {
            return next(new Error('Invalid cookie signature'));
          }
        } else {
          return next(new Error('Invalid cookie format'));
        }

        const payload = await this.jwtService.verifyAsync(token, {
          secret: jwtConstants.secret,
        });

        socket.data.user = payload;
        next();
      } catch (err) {
        console.error('Auth error:', err);
        next(new Error('Authentication error'));
      }
    };
  }

  private parseCookies(cookieString: string): Record<string, string> {
    const cookies: Record<string, string> = {};

    cookieString.split(';').forEach((cookie) => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = value;
      }
    });

    return cookies;
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('roomMessageEmit')
  async onNewMessage(
    @MessageBody() body: NewMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    if (client.data?.user?.sub) {
      this.updateUserActivity(client.data.user.sub);
    }

    let roomId = body.roomId;

    if (!roomId || roomId === 'default') {
      try {
        const generalRoom = await this.roomRepository.findOne({
          where: { name: 'general' },
        });
        if (generalRoom) {
          roomId = generalRoom.id;
        } else {
          roomId = 'default';
        }
      } catch (error) {
        console.error('Error finding general room:', error);
        roomId = 'default';
      }
    }

    // Check if user is in the room before allowing them to send a message
    if (!this.isUserInRoom(client.id, roomId)) {
      client.emit('error', {
        message: 'Cannot send message to a room you have not joined',
      });
      return;
    }

    const messageData = {
      username: client.data.user.username,
      message: body.message,
      timestamp: new Date().toISOString(),
      roomId,
    };

    const savedMessage = await this.gatewayService.saveMessage(messageData);
    this.server.to(roomId).emit('roomMessageBroadcast', savedMessage);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('joinRoom')
  async onJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (client.data?.user?.sub) {
      this.updateUserActivity(client.data.user.sub);
    }

    const roomId = data.roomId;
    const userId = client.data.user.sub;

    try {
      // First, persist the user joining the room in the database
      await this.roomService.joinRoom(roomId, userId);

      // Then, add to socket.io room
      client.join(roomId);

      // Track that this user joined the room
      this.addUserToRoom(client.id, roomId);

      const messages = await this.gatewayService.getMessagesByRoom(roomId);
      client.emit('roomPreviousMessages', messages);

      client.to(roomId).emit('userJoinedRoom', {
        username: client.data.user.username,
        roomId,
      });

      return { success: true };
    } catch (error) {
      console.error('Error joining room:', error);
      client.emit('error', {
        message: error.message || 'Failed to join room',
      });
      return { success: false, error: error.message };
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const onlineUsers = this.getOnlineUsers();
    client.emit('onlineUsersUpdate', onlineUsers);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket) {
    if (client.data?.user?.sub) {
      this.updateUserActivity(client.data.user.sub);
    }
    return { status: 'ok' };
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('getRoomMessages')
  async getRoomMessages(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (client.data?.user?.sub) {
      this.updateUserActivity(client.data.user.sub);
    }

    const roomId = data.roomId;

    // Check if the user is in the room before returning messages
    if (!this.isUserInRoom(client.id, roomId)) {
      client.emit('roomPreviousMessages', []);
      return;
    }

    const messages = await this.gatewayService.getMessagesByRoom(roomId);
    client.emit('roomPreviousMessages', messages);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('leaveRoom')
  async onLeaveRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (client.data?.user?.sub) {
      this.updateUserActivity(client.data.user.sub);
    }

    const roomId = data.roomId;
    const userId = client.data.user.sub;

    // Don't allow leaving the general room
    const generalRoom = await this.roomRepository.findOne({
      where: { name: 'general' },
    });

    if (generalRoom && roomId === generalRoom.id) {
      client.emit('error', {
        message: 'Cannot leave the general room',
      });
      return { error: 'Cannot leave the general room' };
    }

    try {
      // First, persist the user leaving the room in the database
      await this.roomService.leaveRoom(roomId, userId);

      // Then, remove from socket.io room
      client.leave(roomId);

      // Update our tracking
      this.removeUserFromRoom(client.id, roomId);

      client.to(roomId).emit('userLeftRoom', {
        username: client.data.user.username,
        roomId,
      });

      return { success: true };
    } catch (error) {
      console.error('Error leaving room:', error);
      client.emit('error', {
        message: error.message || 'Failed to leave room',
      });
      return { success: false, error: error.message };
    }
  }
}
