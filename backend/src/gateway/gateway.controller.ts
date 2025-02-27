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

interface MessageData {
  sender: string;
  text: string;
  timestamp: string;
  roomId?: string;
}

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
      this.server.emit('event', {
        event: 'userDeleted',
        data: { userData },
      });
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
        socket.emit('event', {
          event: 'previousMessages',
          data: messages,
        });
      }
    });
  }

  private broadcastOnlineUsers() {
    const onlineUsers = this.gatewayService.getOnlineUsers();
    this.server.emit('event', {
      event: 'onlineUsers',
      data: onlineUsers,
    });
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
      client.emit('event', {
        event: 'message',
        data: {
          message: 'no user id',
          type: 'NO_USER_ID',
        },
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

        client.emit('event', {
          event: 'roomLeaveSuccess',
          data: { roomId },
        });

        client.to(roomId).emit('event', {
          event: 'message',
          data: `${client.data.user.username} left the room`,
        });

        client.emit('event', {
          event: 'roomMembershipStatus',
          data: {
            roomId: roomId,
            isMember: false,
          },
        });
      } else {
        client.emit('event', {
          event: 'message',
          data: {
            message: canLeaveRoom.message,
            type: canLeaveRoom.type,
          },
        });
        client.emit('event', {
          event: 'roomMembershipStatus',
          data: {
            roomId: roomId,
            isMember: true,
          },
        });
      }
    } else {
      await this.roomService.joinRoom(roomId, userId);
      client.emit('event', {
        event: 'roomJoinSuccess',
        data: { roomId },
      });

      const messages = await this.gatewayService.getMessagesByRoom(roomId);
      client.emit('event', {
        event: 'previousMessages',
        data: messages,
      });

      client.to(roomId).emit('event', {
        event: 'message',
        data: `${client.data.user.username} joined the room`,
      });

      client.join(roomId);

      client.emit('event', {
        event: 'roomMembershipStatus',
        data: {
          roomId,
          isMember: true,
        },
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
  @SubscribeMessage('sendMessage')
  async onNewMessage(
    @MessageBody() body: { text: string; roomId: string },
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
      client.emit('event', {
        event: 'message',
        data: 'You must join the room to send messages',
      });
      return;
    }

    const messageData: MessageData = {
      sender: client.data.user.username,
      text: body.text,
      timestamp: new Date().toISOString(),
      roomId,
    };

    const savedMessage = await this.gatewayService.saveMessage(messageData);
    this.server.to(roomId).emit('event', {
      event: 'message',
      data: savedMessage,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('joinRoom')
  async onJoinRoom(
    @MessageBody() data: { username: string; room: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.user?.sub;
    if (!userId) return;

    this.gatewayService.updateUserActivity(userId);
    const roomId = data.room;
    const username = data.username;

    try {
      const isInRoom = await this.gatewayService.verifyUserInRoom(
        roomId,
        userId,
      );

      if (isInRoom) {
        client.emit('event', {
          event: 'message',
          data: 'You are already a member of this room',
        });
        return;
      }

      await this.roomService.joinRoom(roomId, userId);

      client.join(roomId);
      client.emit('event', {
        event: 'roomJoinSuccess',
        data: { roomId },
      });

      const messages = await this.gatewayService.getMessagesByRoom(roomId);
      client.emit('event', {
        event: 'previousMessages',
        data: messages,
      });

      // Broadcast to others in room
      client.to(roomId).emit('event', {
        event: 'message',
        data: `${username} joined the room`,
      });
    } catch (error) {
      console.error(`Error joining room: ${error.message}`);
      client.emit('event', {
        event: 'message',
        data: `Error joining room: ${error.message}`,
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
      client.emit('event', {
        event: 'previousMessages',
        data: messages,
      });
      client.emit('event', {
        event: 'roomMembershipStatus',
        data: {
          roomId,
          isMember: true,
          action: 'NONE',
        },
      });
    } else {
      client.emit('event', {
        event: 'previousMessages',
        data: [],
      });
      client.emit('event', {
        event: 'message',
        data: 'You must join the room to see messages or send messages',
      });
      client.emit('event', {
        event: 'roomMembershipStatus',
        data: {
          roomId,
          isMember: false,
          action: 'NONE',
        },
      });
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('leaveRoom')
  async onLeaveRoom(
    @MessageBody() data: { username: string; room: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.user?.sub;
    if (!userId) return;

    this.gatewayService.updateUserActivity(userId);
    const roomId = data.room;
    const username = data.username;

    try {
      const leaveCheck = await this.gatewayService.canLeaveRoom(roomId, userId);

      if (!leaveCheck.canLeave) {
        client.emit('event', {
          event: 'message',
          data: leaveCheck.message,
        });
        return;
      }

      await this.roomService.leaveRoom(roomId, userId);

      client.leave(roomId);
      client.emit('event', {
        event: 'roomLeaveSuccess',
        data: { roomId },
      });

      client.to(roomId).emit('event', {
        event: 'message',
        data: `${username} left the room`,
      });
    } catch (error) {
      console.error(`Error leaving room: ${error.message}`);
      client.emit('event', {
        event: 'message',
        data: `Error leaving room: ${error.message}`,
      });
    }
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('getActiveUsers')
  async onGetActiveUsers(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const activeUsers = await this.gatewayService.getActiveUsersInRoom(
        data.roomId,
      );
      client.emit('event', {
        event: 'activeUsers',
        data: activeUsers,
      });
    } catch (error) {
      console.error(`Error getting active users: ${error.message}`);
      client.emit('event', {
        event: 'message',
        data: `Error getting active users: ${error.message}`,
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
      client.emit('event', {
        event: 'roomMembershipStatus',
        data: {
          roomId: data.roomId,
          isMember,
        },
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

    this.server.emit('event', {
      event: 'newRoom',
      data: data.room,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const onlineUsers = this.gatewayService.getOnlineUsers();
    client.emit('event', {
      event: 'onlineUsers',
      data: onlineUsers,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket) {
    if (client.data?.user?.sub) {
      this.gatewayService.updateUserActivity(client.data.user.sub);
    }
    return { event: 'heartbeatResponse', data: { status: 'ok' } };
  }
}
