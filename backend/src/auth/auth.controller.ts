import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { JWTAuthGuard } from './auth.guard';
import { jwtConstants } from './constants';
import { UsersService } from 'src/users/users.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { User } from 'src/users/dto/users.dto';

@Controller('auth')
export class AuthController {
  private cookieConfig = {
    httpOnly: true,
    signed: true,
    secure: true,
    sameSite: 'none' as const,
    maxAge: jwtConstants.CREDENTIALS_MAX_AGE_IN_SECONDS * 1000,
  };

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('/register')
  async register(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken } = await this.authService.register(createUserDto);
    this.bakeCookie(response, accessToken);
    return { status: 'success', message: 'Registration successful' };
  }

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
    this.bakeCookie(response, accessToken);
    return { status: 'success', message: 'Login successful' };
  }

  private bakeCookie(response: Response, accessToken: string) {
    response.cookie('accessToken', accessToken, this.cookieConfig);
  }

  @UseGuards(JWTAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const username = req?.user?.username;
    if (!username) {
      throw new NotFoundException('User not found');
    }
    return await this.usersService.findOne(username);
  }

  @UseGuards(JWTAuthGuard)
  @Post('logout')
  async handleLogout(
    @Request() req,
    @Res({ passthrough: true }) response: Response,
  ) {
    const username = req?.user?.username;
    if (!username) {
      throw new NotFoundException('User not found');
    }

    response.clearCookie('accessToken', this.cookieConfig);
    return { status: 'success', message: 'Logout successful' };
  }

  @Post('system-login')
  systemSignIn(
    @Body('username') username: string,
    @Body('password') password: string,
    @Body('systemKey') systemKey: string,
  ) {
    return this.authService.systemSignIn(username, password, systemKey);
  }
}
