import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private companiesService: CompaniesService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: User; accessToken: string }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const company = await this.companiesService.getDefaultOrFirst();
    if (!company) {
      throw new BadRequestException('No company configured. Please run db:seed-company first.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      companyId: company.id,
      email: dto.email,
      passwordHash,
      role: dto.role,
      nameAr: dto.nameAr ?? null,
      nameEn: dto.nameEn ?? null,
      phone: dto.phone ?? null,
    });
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });
    return { user, accessToken };
  }

  async login(dto: LoginDto): Promise<{ user: User; accessToken: string }> {
    const user = dto.phone
      ? await this.usersService.findByPhone(dto.phone.trim())
      : await this.usersService.findByEmail(dto.email!);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('هذا الحساب معطل. تواصل مع المدير');
    }
    await this.usersService.updateLastLoginAt(user.id);
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });
    return { user, accessToken };
  }

  async validateUser(id: string): Promise<User | null> {
    return this.usersService.findById(id);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('كلمة المرور الحالية غير صحيحة');
    if (newPassword.length < 6) throw new BadRequestException('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
    await this.usersService.resetPassword(userId, newPassword);
  }
}
