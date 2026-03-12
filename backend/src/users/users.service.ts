import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  role: User['role'];
  nameAr?: string | null;
  nameEn?: string | null;
  phone?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  async create(data: CreateUserData): Promise<User> {
    const user = this.usersRepo.create(data);
    return this.usersRepo.save(user);
  }

  async createWithPassword(
    email: string,
    password: string,
    role: User['role'],
    nameAr?: string | null,
    nameEn?: string | null,
    phone?: string | null,
  ): Promise<User> {
    const existing = await this.findByEmail(email);
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(password, 10);
    return this.create({
      email: email.toLowerCase(),
      passwordHash,
      role,
      nameAr: nameAr ?? null,
      nameEn: nameEn ?? null,
      phone: phone ?? null,
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (dto.nameAr !== undefined) user.nameAr = dto.nameAr;
    if (dto.nameEn !== undefined) user.nameEn = dto.nameEn;
    if (dto.email !== undefined) {
      const existing = await this.findByEmail(dto.email);
      if (existing && existing.id !== id) throw new ConflictException('Email already in use');
      user.email = dto.email.toLowerCase();
    }
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    return this.usersRepo.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepo.find({
      order: { createdAt: 'DESC' },
      select: ['id', 'email', 'role', 'nameAr', 'nameEn', 'phone', 'isActive', 'createdAt'] as (keyof User)[],
    });
  }
}
