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
import { User } from 'src/users/users.dto';
import { Response } from 'express';
import { AuthGuard } from './auth.guard';
import { CREDENTIALS_MAX_AGE_IN_SECONDS } from './constants';
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
      maxAge: CREDENTIALS_MAX_AGE_IN_SECONDS * 1000,
    });

    return {
      status: 'success',
      message: 'login succesful',
    };
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const username = req?.user?.username;
    if (!username) {
      throw NotFoundException;
    }
    const user = await this.usersService.findOne(username);
    return user;
  }

  @UseGuards(AuthGuard)
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
