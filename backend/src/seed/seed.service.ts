import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Room } from '../rooms/entities/room.entity';
import { User } from '../users/entities/user.entity';

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
      // Check if general room already exists
      const existingRoom = await this.roomRepository.findOne({
        where: { name: 'general' },
      });

      if (!existingRoom) {
        // Find or create a system user to be the creator of the general room
        let systemUser = await this.userRepository.findOne({
          where: { username: 'system' },
        });

        if (!systemUser) {
          // Create a system user if it doesn't exist
          systemUser = this.userRepository.create({
            username: 'system',
            password: 'SYSTEM_USER_' + Math.random().toString(36).slice(2, 15),
          });
          await this.userRepository.save(systemUser);
          this.logger.log('System user created for general room creation');
        }

        // Create the general room
        const generalRoom = this.roomRepository.create({
          name: 'general',
          created_by: systemUser,
          created_by_id: systemUser.id,
          members: [systemUser], // Initially include system user
        });

        await this.roomRepository.save(generalRoom);
        this.logger.log('Default general room created successfully');

        // Add all existing users to the general room
        const allUsers = await this.userRepository.find({
          where: { username: Not('system') }, // Exclude system user as it's already added
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

  // Method to add a user to the general room
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

      // Check if user is already a member
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
