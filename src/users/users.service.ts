import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = :email', {
        email: email.toLowerCase().trim(),
      })
      .getOne();
  }

  async create(userData: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<User> {
    const user = this.userRepository.create({
      email: userData.email.toLowerCase().trim(),
      name: userData.name.trim(),
      passwordHash: userData.passwordHash,
    });
    return this.userRepository.save(user);
  }
}
