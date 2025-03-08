import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Socket } from 'socket.io';
import { RoomService } from 'src/room/room.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import { cookieConstants, jwtConstants } from 'src/auth/constants';
import { unsign } from 'cookie-signature';
import { Message } from 'src/message/entities/message.entity';
import { CreateMessageDto } from 'src/message/dto/create-message.dto';
import { User } from 'src/users/entities/user.entity';
import { Room } from 'src/room/entities/room.entity';
import { SerializationContextService } from 'src/context/serialization.context';

type NewMessageDto = {
  username: string;
  text: string;
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
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private roomService: RoomService,
    private eventEmitter: EventEmitter2,
    private serializationContext: SerializationContextService,
  ) {}

  async getAllMessages(): Promise<Message[]> {
    return this.messageRepository.find({
      order: { timestamp: 'ASC' },
    });
  }

  async saveMessage(messageData: CreateMessageDto): Promise<Partial<Message>> {
    const message = this.messageRepository.create({
      room: { id: messageData.roomId } as Room,
      sender: { id: messageData.senderId } as User,
      text: messageData.text,
    });

    const savedMessage = await this.messageRepository.save(message);
    const sender = await this.userRepository.findOneBy({
      id: messageData.senderId,
    });

    return {
      id: savedMessage.id,
      text: savedMessage.text,
      room: savedMessage.room,
      messageType: savedMessage.messageType,
      timestamp: savedMessage.timestamp,
      sender,
    };
  }

  async getMessagesByRoom(roomId: string, limit: number = 50): Promise<Message[]> {
    const messages = await this.messageRepository.find({
      where: {
        room: {
          id: roomId,
        },
      },
      order: { timestamp: 'DESC' },
      take: limit,
      relations: ['sender'],
      select: {
        id: true,
        text: true,
        messageType: true,
        timestamp: true,
        updatedAt: true,
        sender: {
          username: true,
        },
      },
    });

    return messages.reverse();
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

  async getUsersWithTheirStatus(
    { fetchAll }: { fetchAll: boolean } = { fetchAll: false },
  ): Promise<{ id: number; username: string; isOnline: boolean }[]> {
    if (!fetchAll) {
      return Array.from(this.onlineUsers.entries()).map(([id, user]) => ({
        id,
        username: user.username,
        isOnline: true,
      }));
    }

    const topUsers = await this.userRepository.find({
      take: 30,
      select: ['id', 'username'],
    });

    const onlineUserIds = new Set(this.onlineUsers.keys());

    const allUsers = new Map<number, { id: number; username: string; isOnline: boolean }>();

    for (const user of topUsers) {
      allUsers.set(user.id, {
        id: user.id,
        username: user.username,
        isOnline: onlineUserIds.has(user.id),
      });
    }

    for (const [id, user] of this.onlineUsers.entries()) {
      if (!allUsers.has(id)) {
        allUsers.set(id, {
          id,
          username: user.username,
          isOnline: true,
        });
      }
    }

    return Array.from(allUsers.values()).sort((a, b) => Number(b.isOnline) - Number(a.isOnline));
  }

  async getAvailableRooms(userId?: number) {
    return await this.serializationContext.runWithSerialization(() => this.roomService.getAllRooms(userId));
  }

  createAuthMiddleware() {
    return async (socket: Socket, next) => {
      try {
        const cookieString = socket.handshake.headers.cookie || '';
        const cookies = this.parseCookies(cookieString);
        const accessTokenCookieName = cookieConstants.COOKIE_NAMES.ACCESS_TOKEN;

        const signedCookie = cookies?.[accessTokenCookieName]
          ? decodeURIComponent(cookies?.[accessTokenCookieName])
          : undefined;

        let token;

        if (!signedCookie) {
          const authHeader = socket.handshake.headers.authorization;

          if (!authHeader) {
            return next(new Error('Authentication error: Authorization header not provided'));
          }

          if (!authHeader.startsWith('Bearer ')) {
            return next(new Error("Authentication error: Authorization header's value should start with Bearer"));
          }

          token = authHeader.substring(7);
        } else {
          if (!signedCookie.startsWith('s')) {
            return next(new Error('Invalid cookie format'));
          }

          const value = signedCookie.slice(2);
          token = unsign(value, process.env.COOKIE_SIGNING_KEY);

          if (!token) {
            return next(new Error('Invalid cookie signature'));
          }
        }

        try {
          const payload = await this.jwtService.verifyAsync(token, {
            secret: jwtConstants.secret,
          });

          socket.data.user = payload;
          next();
        } catch (jwtError) {
          return next(new Error('Authentication error: Invalid or expired token'));
        }
      } catch (err) {
        console.error('Auth error:', err);
        next(new Error('Authentication error'));
      }
    };
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

  async canLeaveRoom(roomId: string, userId: number): Promise<{ canLeave: boolean; text?: string; type?: string }> {
    const room = await this.roomService.getRoomById(roomId);

    if (room.meta?.isGeneral) {
      return {
        canLeave: false,
        text: 'You cannot leave the general room',
        type: 'CANNOT_LEAVE_GENERAL',
      };
    }

    if (room.created_by_id === userId) {
      return {
        canLeave: false,
        text: 'Room creators cannot leave their own rooms',
        type: 'CANNOT_LEAVE_OWN_ROOM',
      };
    }

    if (room.members.findIndex((member) => member.id === userId) === -1) {
      return {
        canLeave: false,
        text: 'You cannot leave a room that you are not in',
        type: 'CANNOT_LEAVE_ROOM_WHERE_NOT_PRESENT',
      };
    }

    return { canLeave: true };
  }
}
