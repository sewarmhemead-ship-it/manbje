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
} from '@nestjs/common';
import { DrugsService } from './drugs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { requireCompanyId } from '../common/company-id';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateDrugDto } from './dto/create-drug.dto';

@Controller('drugs')
@UseGuards(JwtAuthGuard)
export class DrugsController {
  constructor(private drugsService: DrugsService) {}

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('form') form?: string,
  ) {
    const companyId = user.role !== UserRole.PATIENT ? requireCompanyId(user) : null;
    return this.drugsService.findAll(companyId, search, category, form);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateDrugDto, @CurrentUser() user: User) {
    return this.drugsService.create(dto, requireCompanyId(user));
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateDrugDto>,
    @CurrentUser() user: User,
  ) {
    return this.drugsService.update(id, dto, requireCompanyId(user));
  }

  @Patch(':id/toggle')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  toggle(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.drugsService.toggleActive(id, requireCompanyId(user));
  }
}
