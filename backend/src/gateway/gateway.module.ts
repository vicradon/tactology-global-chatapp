import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { MyGateway } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { jwtConstants } from 'src/auth/constants';
import { Message } from '../message/entities/message.entity';
import { User } from 'src/users/entities/user.entity';
import { Room } from 'src/room/entities/room.entity';
import { RoomService } from 'src/room/room.service';
import { SerializationContextService } from 'src/context/serialization.context';
import { MessageModule } from 'src/message/message.module';
import { UsersService } from 'src/users/users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User, Room]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: jwtConstants.CREDENTIALS_MAX_AGE_IN_SECONDS },
    }),
    MessageModule,
  ],
  providers: [
    MyGateway,
    GatewayService,
    RoomService,
    SerializationContextService,
  ],
  exports: [GatewayService],
})
export class GatewayModule {}
