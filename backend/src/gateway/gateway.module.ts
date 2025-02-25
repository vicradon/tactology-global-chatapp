import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { MyGateway } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { jwtConstants } from 'src/auth/constants';
import { Message } from './entities/message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: jwtConstants.CREDENTIALS_MAX_AGE_IN_SECONDS },
    }),
  ],
  providers: [MyGateway, GatewayService],
  exports: [GatewayService],
})
export class GatewayModule {}
