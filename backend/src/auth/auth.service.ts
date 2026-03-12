import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: User; accessToken: string }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
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
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });
    return { user, accessToken };
  }

  async validateUser(id: string): Promise<User | null> {
    return this.usersService.findById(id);
  }
}
