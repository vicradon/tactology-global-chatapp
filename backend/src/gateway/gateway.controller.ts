import { ClassSerializerInterceptor, OnModuleInit, UseGuards, UseInterceptors } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from './gateway.auth.guard';
import { GatewayService } from './gateway.service';
import { Room } from '../room/entities/room.entity';
import * as dotenv from 'dotenv';
import { RoomService } from 'src/room/room.service';
import { MessageType } from 'src/message/dto/create-message.dto';
dotenv.config();

@UseGuards(WsAuthGuard)
@WebSocketGateway({
  cors: {
    origin: JSON.parse(process.env.ALLOWED_ORIGINS),
    credentials: true,
  },
})
export class MyGateway implements OnModuleInit, OnGatewayDisconnect {
  constructor(
    private gatewayService: GatewayService,
    private roomService: RoomService,
    private eventEmitter: EventEmitter2,
  ) {}

  @WebSocketServer()
  server: Server;

  async onModuleInit() {
    this.server.use(this.gatewayService.createAuthMiddleware());
    this.eventEmitter.on('user.deleted', (userData) => {
      this.server.emit('userChickensOut', { userData });
    });

    this.server.on('connection', async (socket) => {
      try {
        const userId = socket.data.user.sub;
        const username = socket.data.user.username;

        this.gatewayService.addOnlineUser(userId, username, socket.id);
        await this.gatewayService.joinUserToTheirRooms(userId, socket);
        await this.broadcastUsersWithStatus({ fetchAll: true });
        await this.sendRoomsToClient(socket);
      } catch (error) {
        console.error('Error in connection handler:', error);
        socket.emit('roomMessageHistory', []);
      }
    });
  }

  private async broadcastUsersWithStatus({ fetchAll }: { fetchAll: boolean } = { fetchAll: false }) {
    const usersWithStatus = await this.gatewayService.getUsersWithTheirStatus({
      fetchAll,
    });
    this.server.emit('usersWithStatus', {
      data: usersWithStatus,
    });
  }

  async handleDisconnect(socket: Socket) {
    try {
      if (socket.data?.user?.sub) {
        this.gatewayService.removeOnlineUser(socket.data.user.sub);
        await this.broadcastUsersWithStatus({ fetchAll: true });
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }

  async onGatewayDisconnect(socket: Socket) {
    this.handleDisconnect(socket);
  }

  async sendRoomsToClient(client: Socket) {
    const userId = client.data?.user?.sub;
    const availableRooms = await this.gatewayService.getAvailableRooms(userId);
    client.emit('availableRooms', {
      data: availableRooms,
    });
  }

  @SubscribeMessage('availableRooms')
  @UseInterceptors(ClassSerializerInterceptor)
  async onGetRooms(@ConnectedSocket() client: Socket) {
    await this.sendRoomsToClient(client);
  }

  @SubscribeMessage('roomMessageHistory')
  @UseInterceptors(ClassSerializerInterceptor)
  async onRoomMessageHistory(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    try {
      const messages = await this.gatewayService.getMessagesByRoom(data.roomId, 50);
      client.emit('roomMessageHistory', {
        roomId: data.roomId,
        messages: messages.map((msg) => ({ ...msg, sender: msg.sender.username })),
      });
    } catch (error) {
      client.emit('notification', {
        sender: 'system',
        text: `Error fetching room message history: ${error}`,
        timestamp: Date.now(),
      });
    }
  }

  @SubscribeMessage('messageRoom')
  async onNewMessage(@MessageBody() data: { roomId: string; text: string }, @ConnectedSocket() client: Socket) {
    const userId = client.data.user.sub;
    const roomId = data.roomId;
    const messageText = data.text;

    if (!roomId) {
      client.emit('notification', {
        text: 'you must supply a room id to send message to a room',
        sender: 'system',
        messageType: MessageType.SYSTEM,
        timestamp: Date.now(),
      });
      return;
    }

    if (!messageText) {
      client.emit('notification', {
        text: 'you must supply a message text to send a message to a room',
        sender: 'system',
        messageType: MessageType.SYSTEM,
        timestamp: Date.now(),
      });
      return;
    }

    const userInRoom = await this.gatewayService.verifyUserInRoom(roomId, userId);

    if (!userInRoom) {
      client.emit('notification', {
        text: 'you must join the room to send messages',
        sender: 'system',
        messageType: MessageType.SYSTEM,
        timestamp: Date.now(),
      });

      return;
    }

    const messageData = {
      senderId: userId,
      text: messageText,
      roomId,
      timestamp: new Date().toISOString(),
    };

    const savedMessage = await this.gatewayService.saveMessage(messageData);

    this.server.to(roomId).emit('newRoomMessage', savedMessage);
  }

  @SubscribeMessage('joinRoom')
  async onJoinRoom(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    const userId = client.data?.user?.sub;
    this.gatewayService.updateUserActivity(userId);

    try {
      const room = await this.roomService.getRoomById(data.roomId);

      const isInRoom = await this.gatewayService.verifyUserInRoom(room.id, userId);

      if (isInRoom) {
        client.emit('notification', {
          text: `You are already a member of ${room.name}`,
          sender: 'system',
          messageType: MessageType.SYSTEM,
          timestamp: Date.now(),
        });
        return;
      }

      const { joinMessage } = await this.roomService.joinRoom(room.id, userId);

      client.join(room.id);
      client.emit('notification', {
        text: `You joined ${room.name}`,
        sender: {
          username: 'system',
        },
        messageType: MessageType.SYSTEM,
        timestamp: Date.now(),
      });

      const messages = await this.gatewayService.getMessagesByRoom(room.id, 50);
      client.emit('roomMessageHistory', {
        roomId: room.id,
        messages,
      });

      client.to(room.id).emit('newRoomMessage', joinMessage);

      this.sendRoomsToClient(client);
    } catch (error) {
      console.error(`Error joining room: ${error.message}`);
      client.emit('notification', {
        text: `Error joining room: ${error.message}`,
        sender: {
          username: 'system',
        },
        messageType: MessageType.SYSTEM,
        timestamp: Date.now(),
      });
    }
  }

  @SubscribeMessage('leaveRoom')
  async onLeaveRoom(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    const userId = client.data.user.sub;

    this.gatewayService.updateUserActivity(userId);

    try {
      const room = await this.roomService.getRoomById(data.roomId);

      const leaveCheck = await this.gatewayService.canLeaveRoom(room.id, userId);

      if (!leaveCheck.canLeave) {
        client.emit('notification', {
          text: leaveCheck.text,
          sender: 'system',
          messageType: MessageType.SYSTEM,
          timestamp: Date.now(),
        });
        return;
      }

      const { leaveMessage } = await this.roomService.leaveRoom(room.id, userId);

      client.leave(room.id);
      client.emit('notification', {
        text: `You left ${room.name}`,
        sender: 'system',
        messageType: MessageType.SYSTEM,
        timestamp: Date.now(),
      });

      client.to(room.id).emit('newRoomMessage', leaveMessage);

      this.sendRoomsToClient(client);
    } catch (error) {
      console.error(`Error leaving room: ${error.message}`);
      client.emit('notification', {
        text: `Error leaving room: ${error.message}`,
        sender: 'system',
        messageType: MessageType.SYSTEM,
        timestamp: Date.now(),
      });
    }
  }

  @SubscribeMessage('switchToRoom')
  async onSwitchToRoom(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    const userId = client.data?.user?.sub;
    if (!data?.roomId) return;

    const roomId = data.roomId;
    const userInRoom = await this.gatewayService.verifyUserInRoom(roomId, userId);

    if (userInRoom) {
      client.join(roomId);
      const messages = await this.gatewayService.getMessagesByRoom(roomId);
      client.emit('roomMessageHistory', {
        roomId,
        messages,
      });
    } else {
      client.emit('roomMessageHistory', {
        roomId,
        messages: [],
      });
      client.emit('notification', {
        data: {
          text: 'You must join the room to see messages or send messages',
          sender: 'system',
          messageType: MessageType.SYSTEM,
          timestamp: Date.now(),
        },
      });
      client.emit('roomMembershipStatus', {
        roomId,
        isMember: false,
        action: 'NONE',
      });
    }
  }

  @SubscribeMessage('checkRoomMembership')
  async onCheckRoomMembership(@MessageBody() data: { roomId: string }, @ConnectedSocket() client: Socket) {
    const userId = client.data?.user?.sub;
    if (!userId) return;

    try {
      const isMember = await this.gatewayService.verifyUserInRoom(data.roomId, userId);
      client.emit('roomMembershipStatus', {
        roomId: data.roomId,
        isMember,
      });
    } catch (error) {
      console.error(`Error checking room membership: ${error.message}`);
    }
  }

  @SubscribeMessage('roomCreated')
  async onRoomCreated(@MessageBody() data: { room: Room }, @ConnectedSocket() client: Socket) {
    const userId = client.data?.user?.sub;
    if (!userId) return;

    this.gatewayService.updateUserActivity(userId);

    this.server.emit('newRoomCreated', data.room);
  }

  @SubscribeMessage('getOnlineUsers')
  async handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const onlineUsers = await this.gatewayService.getUsersWithTheirStatus({
      fetchAll: true,
    });
    client.emit('usersWithStatus', onlineUsers);
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket) {
    if (client.data?.user?.sub) {
      this.gatewayService.updateUserActivity(client.data.user.sub);
    }
    return { status: 'ok' };
  }
}
