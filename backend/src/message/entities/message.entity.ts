import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Room } from 'src/room/entities/room.entity';
import { MessageType } from '../dto/create-message.dto';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column()
  text: string;

  @Column({ type: 'enum', enum: MessageType, default: MessageType.USER })
  messageType: MessageType;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @CreateDateColumn()
  timestamp: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
