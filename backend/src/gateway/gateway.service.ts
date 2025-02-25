import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';

type NewMessageDto = {
  username: string;
  message: string;
  timestamp: string;
};

@Injectable()
export class GatewayService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
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
}
