import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { SeedService } from '../seed/seed.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private seedService: SeedService,
  ) {}

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

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    const savedUser = await this.usersRepository.save(user);

    await this.seedService.addUserToGeneralRoom(savedUser);

    return savedUser;
  }
  async fetchAll() {
    return this.users;
  }

  async findOne(username: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findById(id: number): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { id } });
  }
}
