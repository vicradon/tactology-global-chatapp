import { Resolver, Query, Mutation, Args, Subscription } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { GatewayService } from '../../gateway/gateway.service';
import { JWTAuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';

const pubSub = new PubSub();

@Resolver('Message')
export class MessageResolver {
  constructor(private gatewayService: GatewayService) {}

  @Query('getMessages')
  @UseGuards(JWTAuthGuard)
  async getMessages(@Args('roomId') roomId: string) {
    const messages = await this.gatewayService.getMessagesByRoom(roomId);
    return messages.map((msg) => ({
      id: msg.id,
      sender: msg.username,
      text: msg.message,
      timestamp: msg.timestamp,
      roomId: msg.roomId,
    }));
  }

  @Mutation('sendMessage')
  @UseGuards(JWTAuthGuard)
  async sendMessage(
    @Args('roomId') roomId: string,
    @Args('text') text: string,
    @CurrentUser() user: User,
  ) {
    const userInRoom = await this.gatewayService.verifyUserInRoom(
      roomId,
      user.id,
    );
    if (!userInRoom) {
      throw new Error('You must join the room to send messages');
    }

    const messageData = {
      sender: user.username,
      text,
      timestamp: new Date().toISOString(),
      roomId,
    };

    const savedMessage = await this.gatewayService.saveMessage(messageData);
    const formattedMessage = {
      id: savedMessage.id,
      sender: savedMessage.username,
      text: savedMessage.message,
      timestamp: savedMessage.timestamp,
      roomId: savedMessage.roomId,
    };

    pubSub.publish('messageAdded', { messageAdded: formattedMessage });

    return formattedMessage;
  }

  @Subscription('messageAdded')
  messageAdded(@Args('roomId') roomId: string) {
    return pubSub.asyncIterableIterator('messageAdded');
  }
}
