import {
  Body,
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JWTAuthGuard } from 'src/auth/auth.guard';

@Controller('rooms')
@UseGuards(JWTAuthGuard)
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  async createRoom(@Request() req, @Body() createRoomDto: CreateRoomDto) {
    const userId = req.user.sub;
    return this.roomService.createRoom(createRoomDto, userId);
  }

  @Post(':roomId/join')
  async joinRoom(@Request() req, @Param('roomId') roomId: string) {
    const userId = req.user.sub;
    return this.roomService.joinRoom(roomId, userId);
  }

  @Delete(':roomId/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveRoom(@Request() req, @Param('roomId') roomId: string) {
    const userId = req.user.sub;
    await this.roomService.leaveRoom(roomId, userId);
  }

  @Get()
  async getAllRooms() {
    return this.roomService.getAllRooms();
  }

  @Get('my')
  async getUserRooms(@Request() req) {
    const userId = req.user.sub;
    return this.roomService.getUserRooms(userId);
  }

  @Get('created')
  async getCreatedRooms(@Request() req) {
    const userId = req.user.sub;
    return this.roomService.getCreatedRooms(userId);
  }

  @Get(':roomId')
  async getRoomById(@Param('roomId') roomId: string) {
    return this.roomService.getRoomById(roomId);
  }
}
