import { Injectable } from '@nestjs/common';
import { User } from './users.dto';

@Injectable()
export class UsersService {
  private readonly users = [
    {
      id: 1,
      username: 'osi',
      password: 'the-nemb',
    },
    {
      id: 2,
      username: 'vicradon',
      password: 'the-voms',
    },
  ];

  async findOne(username: string): Promise<User | undefined> {
    return this.users.find((user) => user.username === username);
  }
  async fetchAll() {
    return this.users;
  }
}
