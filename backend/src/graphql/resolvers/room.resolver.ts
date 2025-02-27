import { Resolver, Query, Mutation, Args, Subscription } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { RoomService } from '../../rooms/room.service';
import { JWTAuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { GatewayService } from '../../gateway/gateway.service';
import { User } from 'src/users/entities/user.entity';

const pubSub = new PubSub();

@Resolver('Room')
export class RoomResolver {
  constructor(
    private roomService: RoomService,
    private gatewayService: GatewayService,
  ) {}

  @Query('getRooms')
  @UseGuards(JWTAuthGuard)
  async getRooms() {
    return this.roomService.findAll();
  }

  @Query('getRoom')
  @UseGuards(JWTAuthGuard)
  async getRoom(@Args('id') id: string) {
    return this.roomService.getRoomById(id);
  }

  @Query('getActiveUsers')
  @UseGuards(JWTAuthGuard)
  async getActiveUsers(@Args('roomId') roomId: string) {
    return this.gatewayService.getActiveUsersInRoom(roomId);
  }

  @Mutation('createRoom')
  @UseGuards(JWTAuthGuard)
  async createRoom(
    @Args('input') createRoomInput: { name: string },
    @CurrentUser() user: User,
  ) {
    const newRoom = await this.roomService.create(
      createRoomInput.name,
      user.id,
    );
    pubSub.publish('roomCreated', { roomCreated: newRoom });
    return newRoom;
  }

  @Mutation('joinRoom')
  @UseGuards(JWTAuthGuard)
  async joinRoom(@Args('roomId') roomId: string, @CurrentUser() user: User) {
    const isInRoom = await this.gatewayService.verifyUserInRoom(
      roomId,
      user.id,
    );

    if (isInRoom) {
      return true;
    }

    await this.roomService.joinRoom(roomId, user.id);
    pubSub.publish('userJoined', {
      userJoined: user.username,
      roomId,
    });

    return true;
  }

  @Mutation('leaveRoom')
  @UseGuards(JWTAuthGuard)
  async leaveRoom(@Args('roomId') roomId: string, @CurrentUser() user: User) {
    const leaveCheck = await this.gatewayService.canLeaveRoom(roomId, user.id);

    if (!leaveCheck.canLeave) {
      throw new Error(leaveCheck.message);
    }

    await this.roomService.leaveRoom(roomId, user.id);
    pubSub.publish('userLeft', {
      userLeft: user.username,
      roomId,
    });

    return true;
  }

  @Subscription('userJoined')
  userJoined(@Args('roomId') roomId: string) {
    return pubSub.asyncIterableIterator('userJoined');
  }

  @Subscription('userLeft')
  userLeft(@Args('roomId') roomId: string) {
    return pubSub.asyncIterableIterator('userLeft');
  }

  @Subscription('roomCreated')
  roomCreated() {
    return pubSub.asyncIterableIterator('roomCreated');
  }
}
