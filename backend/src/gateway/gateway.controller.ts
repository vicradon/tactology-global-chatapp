import { OnModuleInit, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { unsign } from 'cookie-signature';
import { Server, Socket } from 'socket.io';
import { jwtConstants } from 'src/auth/constants';
import { WsAuthGuard } from './gateway.auth.guard';
import { GatewayService } from './gateway.service';
import { Room } from '../rooms/entities/room.entity';
import * as dotenv from 'dotenv';
import { RoomService } from 'src/rooms/room.service';
dotenv.config();

type NewMessageDto = {
  username: string;
  message: string;
  timestamp?: string;
  roomId?: string;
};

@WebSocketGateway({
  cors: {
    origin: JSON.parse(process.env.ALLOWED_ORIGINS),
    credentials: true,
  },
})
export class MyGateway implements OnModuleInit, OnGatewayDisconnect {
  constructor(
    private jwtService: JwtService,
    private gatewayService: GatewayService,
    private roomService: RoomService,
    private eventEmitter: EventEmitter2,
  ) {}

  @WebSocketServer()
  server: Server;

  async onModuleInit() {
    this.server.use(this.createAuthMiddleware());
    this.eventEmitter.on('user.deleted', (userData) => {
      this.server.emit('userChickensOut', { userData });
    });

    this.server.on('connection', async (socket) => {
      try {
        const userId = socket.data.user.sub;
        const username = socket.data.user.username;

        this.gatewayService.addOnlineUser(userId, username, socket.id);
        await this.gatewayService.joinUserToTheirRooms(userId, socket);
        this.broadcastOnlineUsers();
      } catch (error) {
        console.error('Error in connection handler:', error);
        const messages = await this.gatewayService.getAllMessages();
        socket.emit('roomPreviousMessages', messages);
      }
    });
  }

  private broadcastOnlineUsers() {
    const onlineUsers = this.gatewayService.getOnlineUsers();
    this.server.emit('onlineUsersUpdate', onlineUsers);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('updateRoomMembership')
  async checkRoomState(
    @MessageBody() body: { currentRoom: { id: string } },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.user?.sub;
    const roomId = body?.currentRoom?.id;

    if (!userId) {
      client.emit('tempSystemMessage', {
        message: 'no user id',
        type: 'NO_USER_ID',
      });
      return;
    }

    const userInRoom = await this.gatewayService.verifyUserInRoom(
      roomId,
      userId,
    );

    if (userInRoom) {
      const canLeaveRoom = await this.gatewayService.canLeaveRoom(
        roomId,
        userId,
      );

      if (canLeaveRoom.canLeave) {
        await this.roomService.leaveRoom(roomId, userId);
        client.leave(roomId);

        client.emit('roomLeaveSuccess', { roomId });

        client.to(roomId).emit('userLeftRoom', {
          username: client.data.user.username,
          roomId,
        });

        client.emit('roomMembershipStatus', {
          roomId: roomId,
          isMember: false,
        });
      } else {
        client.emit('tempSystemMessage', {
          username: 'system',
          message: canLeaveRoom.message,
          type: canLeaveRoom.type,
        });
        client.emit('roomMembershipStatus', {
          roomId: roomId,
          isMember: true,
        });
      }
    } else {
      await this.roomService.joinRoom(roomId, userId);
      client.emit('roomJoinSuccess', { roomId });

      const messages = await this.gatewayService.getMessagesByRoom(roomId);
      client.emit('roomPreviousMessages', messages);

      client.to(roomId).emit('userJoinedRoom', {
        username: client.data.user.username,
        roomId,
      });

      client.join(roomId);

      client.emit('roomMembershipStatus', {
        roomId,
        isMember: true,
      });
    }
  }

  handleDisconnect(socket: Socket) {
    try {
      if (socket.data?.user?.sub) {
        this.gatewayService.removeOnlineUser(socket.data.user.sub);
        this.broadcastOnlineUsers();
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }

  async onGatewayDisconnect(socket: Socket) {
    this.handleDisconnect(socket);
  }

  private createAuthMiddleware() {
    return async (socket: Socket, next) => {
      try {
        const cookieString = socket.handshake.headers.cookie || '';
        const cookies = this.gatewayService.parseCookies(cookieString);

        const signedCookie = decodeURIComponent(cookies?.['accessToken']);

        if (!signedCookie) {
          return next(new Error('Authentication error'));
        }

        let token;
        if (signedCookie.startsWith('s')) {
          const value = signedCookie.slice(2);
          token = unsign(value, process.env.COOKIE_SIGNING_KEY);
          if (!token) {
            return next(new Error('Invalid cookie signature'));
          }
        } else {
          return next(new Error('Invalid cookie format'));
        }

        const payload = await this.jwtService.verifyAsync(token, {
          secret: jwtConstants.secret,
        });

        socket.data.user = payload;
        next();
      } catch (err) {
        console.error('Auth error:', err);
        next(new Error('Authentication error'));
      }
    };
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('roomMessageEmit')
  async onNewMessage(
    @MessageBody() body: NewMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.user?.sub;
    if (!userId) return;

    this.gatewayService.updateUserActivity(userId);

    const roomId = body.roomId;

    if (!roomId) {
      return;
    }

    const userInRoom = await this.gatewayService.verifyUserInRoom(
      roomId,
      userId,
    );

    if (!userInRoom) {
      client.emit('tempSystemMessage', {
        message: 'you must join the room to send messages',
        username: 'system',
        isTemp: true,
        type: 'NOT_A_MEMBER',
      });

      return;
    }

    const messageData = {
      username: client.data.user.username,
      message: body.message,
      timestamp: new Date().toISOString(),
      roomId,
    };

    const savedMessage = await this.gatewayService.saveMessage(messageData);
    this.server.to(roomId).emit('roomMessageBroadcast', savedMessage);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('joinRoom')
  async onJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.user?.sub;
    if (!userId) return;

    this.gatewayService.updateUserActivity(userId);

    try {
      const isInRoom = await this.gatewayService.verifyUserInRoom(
        data.roomId,
        userId,
      );

      if (isInRoom) {
        client.emit('tempSystemMessage', {
          message: 'You are already a member of this room',
          sender: 'system',
          isTemp: true,
          type: 'ALREADY_A_MEMBER',
        });
        client.emit('roomJoinSuccess', { roomId: data.roomId });
        return;
      }

      await this.roomService.joinRoom(data.roomId, userId);

      client.join(data.roomId);
      client.emit('roomJoinSuccess', { roomId: data.roomId });

      const messages = await this.gatewayService.getMessagesByRoom(data.roomId);
      client.emit('roomPreviousMessages', messages);

      client.to(data.roomId).emit('userJoinedRoom', {
        username: client.data.user.username,
        roomId: data.roomId,
      });
    } catch (error) {
      console.error(`Error joining room: ${error.message}`);
      client.emit('tempSystemMessage', {
        message: `Error joining room: ${error.message}`,
        username: 'system',
        isTemp: true,
        type: 'UNKNOWN',
      });
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('switchToRoom')
  async onSwitchToRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.user?.sub;
    if (!userId) return;

    this.gatewayService.updateUserActivity(userId);

    const roomId = data.roomId;
    const userInRoom = await this.gatewayService.verifyUserInRoom(
      roomId,
      userId,
    );

    if (userInRoom) {
      client.join(roomId);
      const messages = await this.gatewayService.getMessagesByRoom(roomId);
      client.emit('roomPreviousMessages', messages);
      client.emit('roomMembershipStatus', {
        roomId,
        isMember: true,
        action: 'NONE',
      });
    } else {
      client.emit('roomPreviousMessages', []);
      client.emit('tempSystemMessage', {
        message: 'You must join the room to see messages or send messages',
        username: 'system',
        isTemp: true,
        type: 'NOT_A_MEMBER',
      });
      client.emit('roomMembershipStatus', {
        roomId,
        isMember: false,
        action: 'NONE',
      });
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('leaveRoom')
  async onLeaveRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.user?.sub;
    if (!userId) return;

    this.gatewayService.updateUserActivity(userId);

    try {
      const leaveCheck = await this.gatewayService.canLeaveRoom(
        data.roomId,
        userId,
      );

      if (!leaveCheck.canLeave) {
        client.emit('tempSystemMessage', {
          message: leaveCheck.message,
          username: 'system',
          isTemp: true,
          type: leaveCheck.type,
        });
        return;
      }

      await this.roomService.leaveRoom(data.roomId, userId);

      client.leave(data.roomId);
      client.emit('roomLeaveSuccess', { roomId: data.roomId });

      client.to(data.roomId).emit('userLeftRoom', {
        username: client.data.user.username,
        roomId: data.roomId,
      });
    } catch (error) {
      console.error(`Error leaving room: ${error.message}`);
      client.emit('tempSystemMessage', {
        message: `Error leaving room: ${error.message}`,
        username: 'system',
        isTemp: true,
        type: 'ERROR',
      });
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('checkRoomMembership')
  async onCheckRoomMembership(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.user?.sub;
    if (!userId) return;

    try {
      const isMember = await this.gatewayService.verifyUserInRoom(
        data.roomId,
        userId,
      );
      client.emit('roomMembershipStatus', {
        roomId: data.roomId,
        isMember,
      });
    } catch (error) {
      console.error(`Error checking room membership: ${error.message}`);
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('roomCreated')
  async onRoomCreated(
    @MessageBody() data: { room: Room },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.user?.sub;
    if (!userId) return;

    this.gatewayService.updateUserActivity(userId);

    this.server.emit('newRoomCreated', data.room);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const onlineUsers = this.gatewayService.getOnlineUsers();
    client.emit('onlineUsersUpdate', onlineUsers);
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket) {
    if (client.data?.user?.sub) {
      this.gatewayService.updateUserActivity(client.data.user.sub);
    }
    return { status: 'ok' };
  }
}
