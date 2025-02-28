import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
} from 'class-validator';

export enum MessageType {
  SYSTEM = 'system',
  USER = 'user',
}

export class CreateMessageDto {
  @IsNotEmpty()
  @IsString()
  text: string;

  @IsNotEmpty()
  @IsUUID()
  roomId: string;

  @IsNotEmpty()
  @IsUUID()
  senderId: number;

  @IsOptional()
  @IsEnum(MessageType, {
    message: 'MessageType must be either system or user',
  })
  messageType?: MessageType;
}
