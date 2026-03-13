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
import { UserRole } from '../users/entities/user.entity';
import { CreateDrugDto } from './dto/create-drug.dto';

@Controller('drugs')
@UseGuards(JwtAuthGuard)
export class DrugsController {
  constructor(private drugsService: DrugsService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('form') form?: string,
  ) {
    return this.drugsService.findAll(search, category, form);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateDrugDto) {
    return this.drugsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateDrugDto>) {
    return this.drugsService.update(id, dto);
  }

  @Patch(':id/toggle')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  toggle(@Param('id', ParseUUIDPipe) id: string) {
    return this.drugsService.toggleActive(id);
  }
}
