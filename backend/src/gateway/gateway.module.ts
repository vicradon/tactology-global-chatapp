import { Module } from '@nestjs/common';
import { MyGateway } from './gateway.controller';

@Module({
  providers: [MyGateway],
})
export class GatewayModule {}
