import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { GatewayService } from 'src/gateway/gateway.service';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private gatewayService: GatewayService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();

    let tokenError: Error | null = null;
    const nextFunction = (error?: Error) => {
      if (error) tokenError = error;
    };

    await this.gatewayService.createAuthMiddleware()(client, nextFunction);

    if (tokenError) {
      throw new WsException(tokenError.message || 'Unauthorized');
    }

    if (!client.data.user) {
      throw new WsException('User authentication failed');
    }

    return true;
  }
}
