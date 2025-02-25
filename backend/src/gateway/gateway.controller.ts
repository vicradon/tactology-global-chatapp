import { OnModuleInit, UseGuards, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
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
dotenv.config();

type NewMessageDto = {
  username: string;
  message: string;
  timestamp?: string;
  roomId?: string;
};

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3200'],
    credentials: true,
  },
})
export class MyGateway implements OnModuleInit {
  constructor(
    private jwtService: JwtService,
    private gatewayService: GatewayService,
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
        // Find the general room
        const generalRoom = await this.roomRepository.findOne({
          where: { name: 'general' },
        });

        if (generalRoom) {
          // Automatically join the user to the general room
          socket.join(generalRoom.id);

          // Get messages for the general room
          const messages = await this.gatewayService.getMessagesByRoom(
            generalRoom.id,
          );
          socket.emit('roomPreviousMessages', messages);

          // Notify others in the general room
          socket.to(generalRoom.id).emit('userJoinedRoom', {
            username: socket.data.user.username,
            roomId: generalRoom.id,
          });
        } else {
          // Fallback to old behavior if general room doesn't exist
          const messages = await this.gatewayService.getAllMessages();
          socket.emit('roomPreviousMessages', messages);
        }

        this.server.emit('newUserJoined', 'a new user joined');
      } catch (error) {
        console.error('Error in connection handler:', error);
        // Fallback to old behavior
        const messages = await this.gatewayService.getAllMessages();
        socket.emit('roomPreviousMessages', messages);
      }
    });
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
    // Find the general room if no room ID is provided
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

    const messageData = {
      username: client.data.user.username,
      message: body.message,
      timestamp: new Date().toISOString(),
      roomId,
    };

    const savedMessage = await this.gatewayService.saveMessage(messageData);

    // Broadcast to the specific room instead of all clients
    this.server.to(roomId).emit('roomMessageBroadcast', savedMessage);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('joinRoom')
  async onJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = data.roomId;

    client.join(roomId);

    const messages = await this.gatewayService.getMessagesByRoom(roomId);

    client.emit('roomPreviousMessages', messages);

    client.to(roomId).emit('userJoinedRoom', {
      username: client.data.user.username,
      roomId,
    });
  }
}
