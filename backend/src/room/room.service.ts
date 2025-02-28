import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './entities/room.entity';
import { User } from '../users/entities/user.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { SerializationContextService } from 'src/context/serialization.context';
import { instanceToPlain } from 'class-transformer';
import { Message } from 'src/message/entities/message.entity';
import { MessageType } from 'src/message/dto/create-message.dto';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private serializationContext: SerializationContextService,
  ) {}

  async createRoom(
    createRoomDto: CreateRoomDto,
    userId: number,
  ): Promise<Room> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingGeneralRoom = await this.roomRepository.findOne({
      where: { meta: { isGeneral: true } },
    });

    if (createRoomDto.meta?.isGeneral && existingGeneralRoom) {
      throw new BadRequestException('A general room already exists.');
    }

    const room = this.roomRepository.create({
      ...createRoomDto,
      created_by: user,
      created_by_id: user.id,
      members: [user],
    });

    return this.roomRepository.save(room);
  }

  async joinRoom(roomId: string, userId: number): Promise<Room> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['members'],
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMember = room.members.some((member) => member.id === userId);

    if (isMember) {
      throw new BadRequestException('User is already a member of this room');
    }

    room.members.push(user);

    const systemUser = await this.userRepository.findOne({
      where: { username: 'system' },
    });

    const joinMessage = this.messageRepository.create({
      sender: systemUser,
      text: `${user.username} joined`,
      messageType: MessageType.SYSTEM,
      room,
    });

    await this.messageRepository.save(joinMessage);

    return this.roomRepository.save(room);
  }

  async leaveRoom(roomId: string, userId: number): Promise<void> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['members', 'created_by'],
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.created_by_id === userId) {
      throw new ForbiddenException(
        'Room creator cannot leave the room. Transfer ownership first or delete the room.',
      );
    }

    const memberIndex = room.members.findIndex(
      (member) => member.id === userId,
    );

    if (memberIndex === -1) {
      throw new BadRequestException('User is not a member of this room');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });

    const systemUser = await this.userRepository.findOne({
      where: { username: 'system' },
    });

    const leaveMessage = this.messageRepository.create({
      sender: systemUser,
      text: `${user.username} left`,
      messageType: MessageType.SYSTEM,
      room,
    });
    await this.messageRepository.save(leaveMessage);

    room.members.splice(memberIndex, 1);
    await this.roomRepository.save(room);
  }

  async getAllRooms(withMembers = false): Promise<Room[]> {
    const relations = ['created_by'];

    if (withMembers) {
      relations.push('members');
    }

    const rooms = await this.roomRepository.find({
      relations,
    });

    return this.serializationContext.needsSerialization()
      ? (instanceToPlain(rooms) as Room[])
      : rooms;
  }

  async checkIfUserInRoom(roomId: string, userId: number): Promise<boolean> {
    const count = await this.roomRepository
      .createQueryBuilder('room')
      .innerJoin('room.members', 'member')
      .where('room.id = :roomId', { roomId })
      .andWhere('member.id = :userId', { userId })
      .getCount();

    return count > 0;
  }

  async getRoomById(roomId: string): Promise<Room> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['created_by', 'members'],
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  async getUserRooms(userId: number): Promise<Room[]> {
    return this.roomRepository
      .createQueryBuilder('room')
      .innerJoinAndSelect('room.members', 'member', 'member.id = :userId', {
        userId,
      })
      .leftJoinAndSelect('room.created_by', 'created_by')
      .leftJoinAndSelect('room.members', 'members')
      .getMany();
  }

  async getCreatedRooms(userId: number): Promise<Room[]> {
    return this.roomRepository.find({
      where: { created_by_id: userId },
      relations: ['created_by', 'members'],
    });
  }
}
