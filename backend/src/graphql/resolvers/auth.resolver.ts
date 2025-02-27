import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { UsersService } from '../../users/users.service';
import { JWTAuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';

@Resolver('Auth')
export class AuthResolver {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Mutation('login')
  async login(
    @Args('input') loginInput: { username: string; password: string },
  ) {
    const { accessToken } = await this.authService.signIn(
      loginInput.username,
      loginInput.password,
    );

    const user = await this.usersService.findOne(loginInput.username);

    return {
      accessToken,
      user,
    };
  }

  @Mutation('register')
  async register(
    @Args('input') registerInput: { username: string; password: string },
  ) {
    const { accessToken } = await this.authService.register({
      username: registerInput.username,
      password: registerInput.password,
    });

    const user = await this.usersService.findOne(registerInput.username);

    return {
      accessToken,
      user,
    };
  }

  @Query('getProfile')
  @UseGuards(JWTAuthGuard)
  async getProfile(@CurrentUser() user: User) {
    return user;
  }
}
