import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  username: string;

  @Column()
  message: string;

  @Column({ nullable: true })
  roomId: string;

  @Column()
  timestamp: string;

  @CreateDateColumn()
  createdAt: Date;
}
