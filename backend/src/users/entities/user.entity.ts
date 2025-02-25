import { Exclude } from 'class-transformer';
import { Room } from 'src/rooms/entities/room.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToMany,
} from 'typeorm';

@Entity()
export class User {
  @Exclude()
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ default: 'user' })
  role: string;

  @OneToMany(() => Room, (room) => room.created_by)
  createdRooms: Room[];

  @ManyToMany(() => Room, (room) => room.members)
  joinedRooms: Room[];
}
