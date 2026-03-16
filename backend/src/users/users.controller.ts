import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ClassSerializerInterceptor, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { requireCompanyId } from '../common/company-id';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermission('users_view')
  findAll(
    @CurrentUser() user: User,
    @Query('role') role?: UserRole,
    @Query('isActive') isActiveStr?: string,
    @Query('search') search?: string,
  ) {
    const isActive = isActiveStr === 'true' ? true : isActiveStr === 'false' ? false : undefined;
    const companyId = user.role !== UserRole.PATIENT ? requireCompanyId(user) : null;
    return this.usersService.findAll({ companyId, role, isActive, search });
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermission('users_create')
  async create(@Body() dto: CreateUserDto, @CurrentUser() currentUser: User) {
    const companyId = requireCompanyId(currentUser);
    const { user, tempPassword } = await this.usersService.createUser({
      companyId,
      email: dto.email,
      password: dto.password,
      role: dto.role,
      nameAr: dto.nameAr ?? null,
      nameEn: dto.nameEn ?? null,
      phone: dto.phone ?? null,
      specialty: dto.specialty ?? null,
    });
    return { user, tempPassword };
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ) {
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('Forbidden');
    }
    if (currentUser.role !== UserRole.ADMIN && dto.isActive !== undefined) {
      throw new ForbiddenException('Only admin can change isActive');
    }
    return this.usersService.update(id, dto);
  }

  @Patch(':id/role')
  @UseGuards(PermissionsGuard)
  @RequirePermission('users_change_role')
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { role: UserRole },
  ) {
    return this.usersService.updateRole(id, body.role);
  }

  @Patch(':id/toggle')
  @UseGuards(PermissionsGuard)
  @RequirePermission('users_edit')
  toggleActive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.usersService.toggleActive(id, currentUser.id);
  }

  @Post(':id/reset-password')
  @UseGuards(PermissionsGuard)
  @RequirePermission('users_edit')
  async resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new ForbiddenException('User not found');
    const tempPassword = (user.phone ?? '').replace(/\D/g, '').slice(-4).padStart(4, '0') || '0000';
    await this.usersService.resetPassword(id, tempPassword);
    return { tempPassword };
  }
}
