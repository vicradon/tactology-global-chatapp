import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.usersService.findOne(
      createUserDto.username,
    );
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const newUser = { ...createUserDto, password: hashedPassword };

    const user = await this.usersService.create(newUser);
    const payload = this.generatePayload(user);
    return {
      accessToken: await this.jwtService.signAsync(payload),
    };
  }

  async signIn(
    username: string,
    pass: string,
  ): Promise<{ accessToken: string }> {
    const user = await this.usersService.findOne(username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role === 'system') {
      throw new ForbiddenException(
        'You are not sudo. This operation will be flagged',
      );
    }

    return this.validateUserAndGenerateToken(user, pass);
  }

  async systemSignIn(
    username: string,
    pass: string,
    systemKey: string,
  ): Promise<{ accessToken: string }> {
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

  private generatePayload(user) {
    return { sub: user.id, username: user.username, id: user.id };
  }

  private async validateUserAndGenerateToken(user: any, pass: string) {
    const isPasswordValid = await bcrypt.compare(pass, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = this.generatePayload(user);
    return {
      accessToken: await this.jwtService.signAsync(payload),
    };
  }
}
