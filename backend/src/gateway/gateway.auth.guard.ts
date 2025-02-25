import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { jwtConstants } from 'src/auth/constants';
import { unsign } from 'cookie-signature';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();

    const token = this.extractTokenFromSocket(client);

    if (!token) {
      throw new WsException('Unauthorized');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtConstants.secret,
      });

      client.data.user = payload;

      return true;
    } catch {
      throw new WsException('Unauthorized');
    }
  }

  private extractTokenFromSocket(client: Socket): string | undefined {
    const cookieString = client.handshake.headers.cookie || '';
    const cookies = this.parseCookies(cookieString);

    const signedCookie = decodeURIComponent(cookies?.['accessToken']);

    if (!signedCookie) return undefined;

    if (signedCookie.startsWith('s:')) {
      const value = signedCookie.slice(2);
      const unsigned = unsign(value, process.env.COOKIE_SIGNING_KEY);
      return unsigned || undefined;
    }

    return undefined;
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
}
