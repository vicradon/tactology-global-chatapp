import { Exclude } from 'class-transformer';
import { Room } from 'src/room/entities/room.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToMany } from 'typeorm';
import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum UserRole {
  SYSTEM = 'system',
  USER = 'user',
}

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'User role types',
});

@Entity('users')
@ObjectType({ description: 'user' })
export class User {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: number;

  @Column()
  @Field()
  username: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  @Field(() => UserRole)
  role: UserRole;

  @OneToMany(() => Room, (room) => room.created_by)
  @Field(() => [Room], { nullable: true })
  createdRooms: Room[];

  @ManyToMany(() => Room, (room) => room.members)
  @Field(() => [Room], { nullable: true })
  joinedRooms: Room[];
}
