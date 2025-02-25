import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Room } from '../rooms/entities/room.entity';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultRoom();
  }

  async seedDefaultRoom() {
    try {
      const existingRoom = await this.roomRepository.findOne({
        where: { name: 'general' },
      });

      if (!existingRoom) {
        let systemUser = await this.userRepository.findOne({
          where: { username: 'system' },
        });

        if (!systemUser) {
          const salt = await bcrypt.genSalt();
          const hashedPassword = await bcrypt.hash(
            process.env.SYSTEM_USER_PASSWORD,
            salt,
          );

          systemUser = this.userRepository.create({
            username: 'system',
            password: hashedPassword,
            role: 'system',
          });
          await this.userRepository.save(systemUser);
          this.logger.log('System user created for general room creation');
        }

        const generalRoom = this.roomRepository.create({
          name: 'general',
          created_by: systemUser,
          created_by_id: systemUser.id,
          members: [systemUser],
        });

        await this.roomRepository.save(generalRoom);
        this.logger.log('Default general room created successfully');

        const allUsers = await this.userRepository.find({
          where: { username: Not('system') },
        });

        if (allUsers.length > 0) {
          const room = await this.roomRepository.findOne({
            where: { name: 'general' },
            relations: ['members'],
          });

          room.members = [...room.members, ...allUsers];
          await this.roomRepository.save(room);
          this.logger.log(
            `Added ${allUsers.length} existing users to general room`,
          );
        }
      } else {
        this.logger.log('Default general room already exists');
      }
    } catch (error) {
      this.logger.error('Failed to seed default room:', error);
    }
  }

  async addUserToGeneralRoom(user: User): Promise<void> {
    try {
      const generalRoom = await this.roomRepository.findOne({
        where: { name: 'general' },
        relations: ['members'],
      });

      if (!generalRoom) {
        this.logger.error('General room not found when trying to add new user');
        return;
      }

      const isMember = generalRoom.members.some(
        (member) => member.id === user.id,
      );

      if (!isMember) {
        generalRoom.members.push(user);
        await this.roomRepository.save(generalRoom);
        this.logger.log(`User ${user.username} added to general room`);
      }
    } catch (error) {
      this.logger.error(`Failed to add user to general room: ${error.message}`);
    }
  }
}
