import { NotFoundException, UseGuards } from '@nestjs/common';
import { Args, Context, Int, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { LoginUserInput } from './dto/login-user.input';
import { AuthResponse } from './dto/auth-response.type';
import { GraphqlAuthGuard } from './guards/graphql-auth.guard';
import { Response } from 'express';

const pubSub = new PubSub();

@Resolver(() => User)
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @UseGuards(GraphqlAuthGuard)
  @Query(() => User, { name: 'user' })
  async getUser(@Context() context): Promise<User> {
    const userId = context.req?.user?.sub;
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user;
  }

  @UseGuards(GraphqlAuthGuard)
  @Query(() => [User], { name: 'users' })
  async getAllUsers(): Promise<User[]> {
    return this.usersService.fetchAll();
  }

  @Mutation(() => AuthResponse)
  async register(@Args('createUserInput') createUserDto: CreateUserDto, @Context() context): Promise<AuthResponse> {
    const response = context.res;
    const result = await this.authService.register(createUserDto);

    this.authService.bakeCookie(response, result.accessToken);
    pubSub.publish('userAdded', { userAdded: result.user });
    return result;
  }

  @Mutation(() => AuthResponse)
  async login(@Args('loginUserInput') loginUserInput: LoginUserInput, @Context() context): Promise<AuthResponse> {
    const response = context.res;
    const result = await this.authService.signIn(loginUserInput.username, loginUserInput.password);

    this.authService.bakeCookie(response, result.accessToken);
    return result;
  }

  @Mutation(() => Boolean)
  async logout(@Context('res') response: Response): Promise<boolean> {
    this.authService.clearCookie(response);
    return true;
  }

  //   @Subscription(() => User)
  //   userAdded() {
  //     return pubSub.asyncIterator('userAdded');
  //   }
}
