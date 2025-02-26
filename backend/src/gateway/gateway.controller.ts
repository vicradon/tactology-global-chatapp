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
        this.broadcastOnlineUsers();

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
      } catch (error) {
        console.error('Error in connection handler:', error);
        const messages = await this.gatewayService.getAllMessages();
        socket.emit('roomPreviousMessages', messages);
      }
    });
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
      client.emit(
        'tempSystemMessage',
        'you must join the room to see members or send messages',
      );
    }

    /*
    TODO: Decide on this later
    if (!roomId) {
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
      */

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
  @SubscribeMessage('switchToRoom')
  async onSwitchToRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.user?.sub;
    if (!userId) return; // throw an error saying user id not here

    this.updateUserActivity(client.data.user.sub);

    const roomId = data.roomId;
    const userInRoom = await this.roomService.checkIfUserInRoom(roomId, userId);

    if (userInRoom) {
      const messages = await this.gatewayService.getMessagesByRoom(roomId);
      client.emit('roomPreviousMessages', messages);
    } else {
      client.emit(
        'tempSystemMessage',
        'you must join the room to see members or send messages',
      );
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('joinRoom')
  async onJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.user?.sub;
    if (!userId) return; // throw an error saying user id not here

    this.updateUserActivity(client.data.user.sub);

    const roomId = data.roomId;
    await this.roomService.joinRoom(roomId, userId);
    client.join(roomId);
    const messages = await this.gatewayService.getMessagesByRoom(roomId);
    client.emit('roomPreviousMessages', messages);

    client.to(roomId).emit('userJoinedRoom', {
      username: client.data.user.username,
      roomId,
    });
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
