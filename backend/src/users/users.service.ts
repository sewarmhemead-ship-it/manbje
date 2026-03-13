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
  specialty?: string | null;
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

  /** Admin creates staff: auto temp password = last 4 digits of phone if password not provided. */
  async createUser(dto: {
    email: string;
    password?: string;
    role: User['role'];
    nameAr?: string | null;
    nameEn?: string | null;
    phone?: string | null;
    specialty?: string | null;
  }): Promise<{ user: User; tempPassword: string }> {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');
    const tempPassword =
      dto.password && dto.password.length >= 6
        ? dto.password
        : (dto.phone ?? '').replace(/\D/g, '').slice(-4).padStart(4, '0') || '0000';
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const user = await this.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      role: dto.role,
      nameAr: dto.nameAr ?? null,
      nameEn: dto.nameEn ?? null,
      phone: dto.phone ?? null,
      specialty: dto.specialty ?? null,
    });
    return { user, tempPassword };
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
    if (dto.specialty !== undefined) user.specialty = dto.specialty;
    return this.usersRepo.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email: email.toLowerCase() } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    const normalized = phone.replace(/\s/g, '').trim();
    const withPlus = normalized.startsWith('+') ? normalized : '+' + normalized.replace(/\D/g, '');
    return this.usersRepo.findOne({
      where: [{ phone: normalized }, { phone: withPlus }],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async updateLastLoginAt(id: string): Promise<void> {
    await this.usersRepo.update(id, { lastLoginAt: new Date() });
  }

  async findAll(filters: { role?: User['role']; isActive?: boolean; search?: string } = {}): Promise<User[]> {
    const qb = this.usersRepo
      .createQueryBuilder('u')
      .orderBy('u.created_at', 'DESC');
    if (filters.role) qb.andWhere('u.role = :role', { role: filters.role });
    if (filters.isActive !== undefined) qb.andWhere('u.is_active = :isActive', { isActive: filters.isActive });
    if (filters.search?.trim()) {
      qb.andWhere(
        '(u.name_ar ILIKE :search OR u.name_en ILIKE :search OR u.email ILIKE :search OR u.phone ILIKE :search)',
        { search: `%${filters.search.trim()}%` }
      );
    }
    return qb.getMany();
  }

  async updateRole(id: string, role: User['role']): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.role = role;
    return this.usersRepo.save(user);
  }

  async toggleActive(id: string, deactivatedBy?: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.isActive = !user.isActive;
    user.deactivatedAt = user.isActive ? null : new Date();
    user.deactivatedBy = user.isActive ? null : deactivatedBy ?? null;
    return this.usersRepo.save(user);
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepo.update(id, { passwordHash });
  }
}
