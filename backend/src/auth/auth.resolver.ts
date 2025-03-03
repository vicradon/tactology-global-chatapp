import { NotFoundException } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { LoginUserInput } from './dto/login-user.input';
import { AuthResponse } from './dto/auth-response.type';

const pubSub = new PubSub();

@Resolver(() => User)
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Query(() => User, { name: 'user' })
  async getUser(@Args('id', { type: () => Int }) id: number): Promise<User> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  @Query(() => [User], { name: 'users' })
  async getAllUsers(): Promise<User[]> {
    return this.usersService.fetchAll();
  }

  @Mutation(() => AuthResponse)
  async register(@Args('createUserInput') createUserDto: CreateUserDto): Promise<AuthResponse> {
    const result = await this.authService.register(createUserDto);
    pubSub.publish('userAdded', { userAdded: result.user });
    return result;
  }

  @Mutation(() => AuthResponse)
  async login(@Args('loginUserInput') loginUserInput: LoginUserInput): Promise<AuthResponse> {
    return this.authService.signIn(loginUserInput.username, loginUserInput.password);
  }

  //   @Subscription(() => User)
  //   userAdded() {
  //     return pubSub.asyncIterator('userAdded');
  //   }
}
