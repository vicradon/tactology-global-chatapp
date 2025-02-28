import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Message } from 'src/message/entities/message.entity';
import { Room } from 'src/room/entities/room.entity';
import { User, UserRole } from 'src/users/entities/user.entity';
import { MessageType } from 'src/message/dto/create-message.dto';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);
  private systemUser: User = undefined;

  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  async onModuleInit() {
    await this.seedUsers();
    await this.seedDefaultRooms();
  }

  async createUser(username: string, password: string, isSystemUser = false) {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      username,
      password: hashedPassword,
      role: isSystemUser ? UserRole.SYSTEM : UserRole.USER,
    });

    return this.userRepository.save(user);
  }

  async seedUsers() {
    try {
      this.systemUser = await this.userRepository.findOne({
        where: { username: 'system' },
      });

      if (!this.systemUser) {
        this.systemUser = await this.createUser(
          'system',
          process.env.SYSTEM_USER_PASSWORD,
          true,
        );
        this.logger.log('System user created');
      }

      const otherUsers = [
        { username: 'guy', password: 'the-guy' },
        { username: 'fawks', password: 'the-fawks' },
      ];

      await Promise.all(
        otherUsers.map(async (user) => {
          const isExisting = await this.userRepository.findOne({
            where: { username: user.username },
          });

          if (!isExisting) {
            await this.createUser(user.username, user.password);
          }
        }),
      );
    } catch (error) {
      this.logger.error('Failed to seed users:', error);
    }
  }

  async seedDefaultRooms() {
    try {
      if (!this.systemUser) return;

      const defaultRooms = [
        { name: 'General', meta: { isGeneral: true } },
        { name: 'Anime', meta: {} },
        { name: 'Video Games', meta: {} },
      ];

      await Promise.all(
        defaultRooms.map(async (roomData) => {
          let existingRoom = await this.roomRepository.findOne({
            where: { name: roomData.name },
          });

          if (!existingRoom) {
            const newRoom = this.roomRepository.create({
              ...roomData,
              created_by: this.systemUser,
              created_by_id: this.systemUser.id,
              members: roomData.meta.isGeneral ? [this.systemUser] : [],
            });

            await this.roomRepository.save(newRoom);
            this.logger.log(`${roomData.name} room created`);
          }
        }),
      );

      const allUsers = await this.userRepository.find({
        where: { username: Not('system') },
      });

      if (allUsers.length > 0) {
        const generalRoom = await this.roomRepository.findOne({
          where: { meta: { isGeneral: true } },
          relations: ['members'],
        });

        for (const user of allUsers) {
          await this.addUserToGeneralRoom(user, generalRoom);
        }
      }
    } catch (error) {
      this.logger.error('Failed to seed default rooms:', error);
    }
  }

  async addUserToGeneralRoom(
    user: User,
    generalRoom: Room = undefined,
  ): Promise<void> {
    try {
      // this ensures we do less fetching when we are calling this over and over again
      if (!generalRoom) {
        generalRoom = await this.roomRepository.findOne({
          where: { meta: { isGeneral: true } },
          relations: ['members'],
        });
      }

      const isMember = generalRoom.members.some(
        (member) => member.id === user.id,
      );

      if (!isMember) {
        generalRoom.members.push(user);
        await this.roomRepository.save(generalRoom);
        await this.createSystemMessage(generalRoom, user);
        this.logger.log(`User ${user.username} added to general room`);
      }
    } catch (error) {
      this.logger.error(`Failed to add user to general room: ${error.message}`);
    }
  }

  private async createSystemMessage(room: Room, user: User) {
    const joinMessage = this.messageRepository.create({
      sender: this.systemUser,
      text: `${user.username} was added`,
      messageType: MessageType.SYSTEM,
      room,
    });

    await this.messageRepository.save(joinMessage);
  }
}
