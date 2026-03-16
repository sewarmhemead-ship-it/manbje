import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { requireCompanyId } from '../common/company-id';
import { User, UserRole } from '../users/entities/user.entity';

@Controller('equipment')
@UseGuards(JwtAuthGuard)
export class EquipmentController {
  constructor(private equipmentService: EquipmentService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateEquipmentDto, @CurrentUser() user: User) {
    return this.equipmentService.create(dto, requireCompanyId(user));
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  findAll(@CurrentUser() user: User, @Query('availableOnly') availableOnly?: string) {
    const companyId = user.role !== UserRole.PATIENT ? requireCompanyId(user) : null;
    return this.equipmentService.findAll(companyId, availableOnly === 'true');
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    const companyId = user.role !== UserRole.PATIENT ? requireCompanyId(user) : null;
    return this.equipmentService.findOne(id, companyId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentDto,
    @CurrentUser() user: User,
  ) {
    return this.equipmentService.update(id, dto, requireCompanyId(user));
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.equipmentService.remove(id, requireCompanyId(user));
  }
}
