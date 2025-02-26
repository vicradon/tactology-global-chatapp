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
import * as dotenv from 'dotenv';
import { RoomService } from 'src/rooms/room.service';
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
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3200'],
    credentials: true,
  },
})
export class MyGateway implements OnModuleInit, OnGatewayDisconnect {
  private onlineUsers: Map<number, OnlineUser> = new Map();

  constructor(
    private jwtService: JwtService,
    private gatewayService: GatewayService,
    private roomService: RoomService,
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
        await this.joinUserToTheirRooms(userId, socket);
        this.broadcastOnlineUsers();
      } catch (error) {
        console.error('Error in connection handler:', error);
        const messages = await this.gatewayService.getAllMessages();
        socket.emit('roomPreviousMessages', messages);
      }

      /*

        const generalRoom = await this.roomRepository.findOne({
          where: { name: 'general' },
        });

        if (generalRoom) {
          socket.join(generalRoom.id);

          const messages = await this.gatewayService.getMessagesByRoom(
            generalRoom.id,
          );
          socket.emit('roomPreviousMessages', messages);

          socket.to(generalRoom.id).emit('userJoinedRoom', {
            username: socket.data.user.username,
            roomId: generalRoom.id,
          });
        } else {
          const messages = await this.gatewayService.getAllMessages();
          socket.emit('roomPreviousMessages', messages);
        }

        this.server.emit('newUserJoined', 'a new user joined');
   
        */
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('clientStateUpdate')
  async clientStateUpdate(
    @MessageBody() body: { activeRoom: { id: string } },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.user?.sub;

    if (!userId) {
      client.emit('tempSystemMessage', {
        message: 'no user id',
        type: 'NO_USER_ID',
      });
      return;
    }

    const userInRoom = await this.roomService.checkIfUserInRoom(
      body.activeRoom.id,
      userId,
    );

    if (!userInRoom) {
      client.emit('tempSystemMessage', {
        message: 'you must join the room to send messages',
        type: 'NOT_A_MEMBER',
      });

      return;
    }

    const messages = await this.gatewayService.getMessagesByRoom(
      body.activeRoom.id,
    );
    client.emit('roomPreviousMessages', messages);
  }

  handleDisconnect(socket: Socket) {
    try {
      if (socket.data?.user?.sub) {
        this.removeOnlineUser(socket.data.user.sub);
        this.broadcastOnlineUsers();
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }

  async onGatewayDisconnect(socket: Socket) {
    this.handleDisconnect(socket);
  }

  private addOnlineUser(userId: number, username: string, socketId: string) {
    this.onlineUsers.set(userId, {
      username,
      socketId,
      lastActive: new Date(),
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
    const userId = client.data?.user?.sub;
    if (!userId) return;

    this.updateUserActivity(userId);

    const roomId = body.roomId;

    if (!roomId) {
      return;
    }

    const userInRoom = await this.roomService.checkIfUserInRoom(roomId, userId);

    if (!userInRoom) {
      client.emit('tempSystemMessage', {
        message: 'you must join the room to send messages',
      });
    }

    const messageData = {
      username: client.data.user.username,
      message: body.message,
      timestamp: new Date().toISOString(),
      roomId,
    };

    console.log(messageData);

    const savedMessage = await this.gatewayService.saveMessage(messageData);
    this.server.to(roomId).emit('roomMessageBroadcast', savedMessage);
  }

  private async joinUserToTheirRooms(userId: number, client: Socket) {
    const userRooms = await this.roomService.getUserRooms(userId);

    for (const room of userRooms) {
      client.join(room.id);
      console.log(`User ${userId} joined room ${room.id}`);
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('joinRoom')
  async onJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.user?.sub;
    if (!userId) return;

    this.updateUserActivity(userId);

    try {
      // Check if user is already in the room
      const isInRoom = await this.roomService.checkIfUserInRoom(
        data.roomId,
        userId,
      );

      if (isInRoom) {
        client.emit('tempSystemMessage', {
          message: 'You are already a member of this room',
          type: 'ALREADY_A_MEMBER',
        });
        client.emit('roomJoinSuccess', { roomId: data.roomId });
        return;
      }

      // Join in database
      await this.roomService.joinRoom(data.roomId, userId);

      // Join in Socket.IO
      client.join(data.roomId);
      console.log(
        `User ${userId} joined room ${data.roomId} via joinRoom event`,
      );

      // Notify user of success
      client.emit('roomJoinSuccess', { roomId: data.roomId });

      // Fetch messages and send to client
      const messages = await this.gatewayService.getMessagesByRoom(data.roomId);
      client.emit('roomPreviousMessages', messages);

      // Notify others in the room
      client.to(data.roomId).emit('userJoinedRoom', {
        username: client.data.user.username,
        roomId: data.roomId,
      });
    } catch (error) {
      console.error(`Error joining room: ${error.message}`);
      client.emit('tempSystemMessage', {
        message: `Error joining room: ${error.message}`,
        type: 'UNKNOWN',
      });
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('switchToRoom')
  async onSwitchToRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.user?.sub;
    if (!userId) return;

    this.updateUserActivity(userId);

    const roomId = data.roomId;
    const userInRoom = await this.roomService.checkIfUserInRoom(roomId, userId);

    if (userInRoom) {
      // Explicitly join the socket.io room
      client.join(roomId);
      const messages = await this.gatewayService.getMessagesByRoom(roomId);
      client.emit('roomPreviousMessages', messages);
      client.emit('roomMembershipStatus', { roomId, isMember: true });
    } else {
      // Clear messages but inform user they need to join
      client.emit('roomPreviousMessages', []);
      client.emit('tempSystemMessage', {
        message: 'You must join the room to see messages or send messages',
        type: 'NOT_A_MEMBER',
      });
      client.emit('roomMembershipStatus', { roomId, isMember: false });
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('leaveRoom')
  async onLeaveRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.user?.sub;
    if (!userId) return;

    this.updateUserActivity(userId);

    try {
      // Check if room is general
      const room = await this.roomService.getRoomById(data.roomId);
      if (room.meta?.isGeneral) {
        client.emit('tempSystemMessage', {
          message: 'You cannot leave the general room',
          type: 'CANNOT_LEAVE_GENERAL',
        });
        return;
      }

      // Check if user is the creator
      if (room.created_by_id === userId) {
        client.emit('tempSystemMessage', {
          message: 'Room creators cannot leave their own rooms',
          type: 'CANNOT_LEAVE_OWN_ROOM',
        });
        return;
      }

      // Leave in database
      await this.roomService.leaveRoom(data.roomId, userId);

      // Leave in Socket.IO
      client.leave(data.roomId);
      console.log(`User ${userId} left room ${data.roomId}`);

      // Notify user of success
      client.emit('roomLeaveSuccess', { roomId: data.roomId });

      // Notify others in the room
      client.to(data.roomId).emit('userLeftRoom', {
        username: client.data.user.username,
        roomId: data.roomId,
      });
    } catch (error) {
      console.error(`Error leaving room: ${error.message}`);
      client.emit('tempSystemMessage', {
        message: `Error leaving room: ${error.message}`,
        type: 'ERROR',
      });
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('checkRoomMembership')
  async onCheckRoomMembership(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.user?.sub;
    if (!userId) return;

    try {
      const isMember = await this.roomService.checkIfUserInRoom(
        data.roomId,
        userId,
      );
      client.emit('roomMembershipStatus', {
        roomId: data.roomId,
        isMember,
      });
    } catch (error) {
      console.error(`Error checking room membership: ${error.message}`);
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('roomCreated')
  async onRoomCreated(
    @MessageBody() data: { room: Room },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.user?.sub;
    if (!userId) return;

    this.updateUserActivity(userId);

    // Broadcast the new room to all connected clients
    this.server.emit('newRoomCreated', data.room);

    // Log the event
    console.log(
      `User ${userId} created a new room: ${data.room.name} (${data.room.id})`,
    );
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
}
