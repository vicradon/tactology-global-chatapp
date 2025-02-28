import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { Room } from './entities/room.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { SerializationContextService } from 'src/context/serialization.context';
import { Message } from 'src/message/entities/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Room, User, Message])],
  providers: [RoomService, SerializationContextService],
  controllers: [RoomController],
})
export class RoomModule {}
