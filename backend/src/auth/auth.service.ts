import { ConflictException, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/entities/user.entity';
import { Response } from 'express';
import { cookieConstants, jwtConstants } from './constants';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  cookieConfig = {
    httpOnly: true,
    signed: true,
    secure: true,
    sameSite: 'none' as const,
    maxAge: jwtConstants.CREDENTIALS_MAX_AGE_IN_SECONDS * 1000,
    // domain: new URL(process.env.API_BASE_URL).hostname,
  };

  async register(createUserDto: CreateUserDto): Promise<{ accessToken: string; user: User }> {
    const existingUser = await this.usersService.findOne(createUserDto.username);
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const newUser = { ...createUserDto, password: hashedPassword };

    const user = await this.usersService.create(newUser);
    const payload = { sub: user.id, username: user.username };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user,
    };
  }

  async signIn(username: string, pass: string): Promise<{ accessToken: string; user: User }> {
    const user = await this.usersService.findOne(username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role === 'system') {
      throw new ForbiddenException('You are not sudo. This operation will be flagged');
    }

    const { accessToken } = await this.validateUserAndGenerateToken(user, pass);

    return {
      accessToken,
      user,
    };
  }

  bakeCookie(response: Response, accessToken: string) {
    response.cookie(cookieConstants.COOKIE_NAMES.ACCESS_TOKEN, accessToken, this.cookieConfig);
  }

  clearCookie(response: Response) {
    response.clearCookie(cookieConstants.COOKIE_NAMES.ACCESS_TOKEN, this.cookieConfig);
  }

  async systemSignIn(username: string, pass: string, systemKey: string): Promise<{ accessToken: string }> {
    const user = await this.usersService.findOne(username);
    if (!user || user.role !== 'system') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validSystemKey = process.env.SYSTEM_USER_KEY;
    if (systemKey !== validSystemKey) {
      throw new UnauthorizedException('Invalid system key');
    }

    return this.validateUserAndGenerateToken(user, pass);
  }

  private async validateUserAndGenerateToken(user: any, pass: string) {
    const isPasswordValid = await bcrypt.compare(pass, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, username: user.username };

    return {
      accessToken: await this.jwtService.signAsync(payload),
    };
  }
}
