import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private schedulesService: SchedulesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  create(@Body() dto: CreateScheduleDto, @CurrentUser() user: User) {
    if (user.role === UserRole.DOCTOR && dto.doctorId !== user.id) {
      throw new ForbiddenException('You can only create schedules for yourself');
    }
    return this.schedulesService.create(dto);
  }

  @Get('doctor/:doctorId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  findByDoctor(
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
    @CurrentUser() user: User,
  ) {
    if (user.role === UserRole.DOCTOR && doctorId !== user.id) {
      throw new ForbiddenException('You can only view your own schedule');
    }
    return this.schedulesService.findByDoctor(doctorId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.schedulesService.remove(id);
  }
}
