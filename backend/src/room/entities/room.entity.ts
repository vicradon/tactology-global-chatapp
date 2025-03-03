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
import { Field, ID, ObjectType } from '@nestjs/graphql';

@Entity('rooms')
@ObjectType({ description: 'chat room' })
export class Room {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column()
  @Field()
  name: string;

  @ManyToOne(() => User, (user) => user.createdRooms)
  @JoinColumn({ name: 'created_by_id' })
  @Field(() => User)
  created_by: User;

  @Column()
  @Field(() => ID)
  created_by_id: number;

  @CreateDateColumn()
  @Field()
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
  @Field(() => [User], { nullable: true })
  members: User[];

  @Column({ type: 'jsonb', nullable: true }) // pgsql
  @Field(() => String, { nullable: true, description: 'JSON metadata for the room' })
  meta: Record<string, any>;
}
