import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
  Req,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from 'src/users/dto/users.dto';
import { Response } from 'express';
import { JWTAuthGuard } from './auth.guard';
import { jwtConstants } from './constants';
import { UsersService } from 'src/users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('/login')
  async signIn(
    @Body() signInDto: User,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken } = await this.authService.signIn(
      signInDto.username,
      signInDto.password,
    );

    response.cookie('accessToken', accessToken, {
      httpOnly: true,
      signed: true,
      secure: true,
      sameSite: true,
      maxAge: jwtConstants.CREDENTIALS_MAX_AGE_IN_SECONDS * 1000,
    });

    return {
      status: 'success',
      message: 'login succesful',
    };
  }

  @UseGuards(JWTAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const username = req?.user?.username;
    if (!username) {
      throw NotFoundException;
    }
    const user = await this.usersService.findOne(username);
    return user;
  }

  @UseGuards(JWTAuthGuard)
  @Post('logout')
  async handleLogout(
    @Request() req,
    @Res({ passthrough: true }) response: Response,
  ) {
    const username = req?.user?.username;
    if (!username) {
      throw NotFoundException;
    }

    response.clearCookie('accessToken', {
      httpOnly: true,
      signed: true,
      secure: true,
      sameSite: true,
    });

    return {};
  }
}
