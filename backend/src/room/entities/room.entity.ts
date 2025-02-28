import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => User, (user) => user.createdRooms)
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;

  @Column()
  created_by_id: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToMany(() => User, (user) => user.joinedRooms)
  @JoinTable({
    name: 'room_members',
    joinColumn: {
      name: 'room_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
    },
  })
  members: User[];

  @Column({ type: 'jsonb', nullable: true }) // pgsql
  meta: Record<string, any>;
}
