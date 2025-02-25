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
import * as dotenv from 'dotenv';
dotenv.config();

type NewMessage = {
  username: string;
  message: string;
  timestamp: string;
};

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3200'],
    credentials: true,
  },
})
export class MyGateway implements OnModuleInit {
  constructor(private jwtService: JwtService) {}

  @WebSocketServer()
  server: Server;

  messages: NewMessage[] = [];

  onModuleInit() {
    this.server.use(this.createAuthMiddleware());
    this.server.on('connection', (socket) => {
      console.log(socket.id);
      console.log('Connected');
      socket.emit('roomPreviousMessages', this.messages);
      this.server.emit('newUserJoined', 'a new user joined');
    });
  }

  private createAuthMiddleware() {
    return async (socket: Socket, next) => {
      try {
        const cookieString = socket.handshake.headers.cookie || '';
        const cookies = this.parseCookies(cookieString);

        // Get the signed cookie
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

        // Store user info in socket for later use
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
  onNewMessage(
    @MessageBody() body: NewMessage,
    @ConnectedSocket() client: Socket,
  ) {
    body.username = client.data.user.username;
    body.timestamp = new Date().toISOString();
    this.messages.push(body);
    this.server.emit('roomMessageBroadcast', body);
  }
}
