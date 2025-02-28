import { Exclude } from 'class-transformer';
import { Room } from 'src/rooms/entities/room.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToMany,
} from 'typeorm';

export enum UserRole {
  SYSTEM = 'system',
  USER = 'user',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @OneToMany(() => Room, (room) => room.created_by)
  createdRooms: Room[];

  @ManyToMany(() => Room, (room) => room.members)
  joinedRooms: Room[];
}
