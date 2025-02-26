import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Message } from './entities/message.entity';
import { Socket } from 'socket.io';
import { RoomService } from 'src/rooms/room.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

type NewMessageDto = {
  username: string;
  message: string;
  timestamp: string;
  roomId?: string;
};

interface OnlineUser {
  username: string;
  socketId: string;
  lastActive: Date;
}

@Injectable()
export class GatewayService {
  private onlineUsers: Map<number, OnlineUser> = new Map();

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private roomService: RoomService,
    private eventEmitter: EventEmitter2,
  ) {}

  async getAllMessages(): Promise<Message[]> {
    return this.messageRepository.find({
      order: { timestamp: 'ASC' },
    });
  }

  async saveMessage(messageData: NewMessageDto): Promise<Message> {
    const message = this.messageRepository.create(messageData);
    return this.messageRepository.save(message);
  }

  async getMessagesByRoom(roomId: string): Promise<Message[]> {
    return this.messageRepository.find({
      where: { roomId },
      order: { timestamp: 'ASC' },
    });
  }

  removeUserAccount(user: CreateUserDto) {
    const safeUserData = {
      username: user.username,
    };

    this.eventEmitter.emit('user.deleted', safeUserData);
    return null;
  }

  async joinUserToTheirRooms(userId: number, client: Socket) {
    const userRooms = await this.roomService.getUserRooms(userId);

    for (const room of userRooms) {
      client.join(room.id);
      console.log(`User ${userId} joined room ${room.id}`);
    }
  }

  addOnlineUser(userId: number, username: string, socketId: string) {
    this.onlineUsers.set(userId, {
      username,
      socketId,
      lastActive: new Date(),
    });
  }

  removeOnlineUser(userId: number) {
    this.onlineUsers.delete(userId);
  }

  updateUserActivity(userId: number) {
    const user = this.onlineUsers.get(userId);
    if (user) {
      user.lastActive = new Date();
    }
  }

  getOnlineUsers(): OnlineUser[] {
    return Array.from(this.onlineUsers.values());
  }

  parseCookies(cookieString: string): Record<string, string> {
    const cookies: Record<string, string> = {};

    cookieString.split(';').forEach((cookie) => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = value;
      }
    });

    return cookies;
  }

  async verifyUserInRoom(roomId: string, userId: number): Promise<boolean> {
    return this.roomService.checkIfUserInRoom(roomId, userId);
  }

  async canLeaveRoom(
    roomId: string,
    userId: number,
  ): Promise<{ canLeave: boolean; message?: string; type?: string }> {
    const room = await this.roomService.getRoomById(roomId);

    if (room.meta?.isGeneral) {
      return {
        canLeave: false,
        message: 'You cannot leave the general room',
        type: 'CANNOT_LEAVE_GENERAL',
      };
    }

    if (room.created_by_id === userId) {
      return {
        canLeave: false,
        message: 'Room creators cannot leave their own rooms',
        type: 'CANNOT_LEAVE_OWN_ROOM',
      };
    }

    return { canLeave: true };
  }
}
