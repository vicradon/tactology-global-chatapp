import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from '../room/entities/room.entity';
import { User } from '../users/entities/user.entity';
import { SeedService } from './seed.service';
import { Message } from 'src/message/entities/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Room, User, Message])],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
