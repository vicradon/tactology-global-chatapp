import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { RoomModule } from '../room/room.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Message, User]), RoomModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class MessageModule {}
