import { OnModuleInit, UseGuards } from '@nestjs/common';
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
  ) {}

  @WebSocketServer()
  server: Server;

  async onModuleInit() {
    this.server.use(this.createAuthMiddleware());
    this.server.on('connection', async (socket) => {
      console.log(socket.id);
      console.log('Connected');

      const messages = await this.gatewayService.getAllMessages();
      socket.emit('roomPreviousMessages', messages);
      this.server.emit('newUserJoined', 'a new user joined');
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
    const messageData = {
      username: client.data.user.username,
      message: body.message,
      timestamp: new Date().toISOString(),
      roomId: body.roomId || 'default',
    };

    const savedMessage = await this.gatewayService.saveMessage(messageData);

    this.server.emit('roomMessageBroadcast', savedMessage);
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
