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

  async getSystemUser(): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { username: 'system' },
    });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    const savedUser = await this.usersRepository.save(user);
    await this.seedService.addUserToGeneralRoom(savedUser);
    return savedUser;
  }

  async fetchAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'username', 'role'],
    });
  }

  async findOne(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }
}
