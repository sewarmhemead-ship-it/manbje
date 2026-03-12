import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ClinicalSessionsService } from './clinical-sessions.service';
import { CreateClinicalSessionDto } from './dto/create-clinical-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@Controller('clinical-sessions')
@UseGuards(JwtAuthGuard)
export class ClinicalSessionsController {
  constructor(private clinicalSessionsService: ClinicalSessionsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  create(@Body() dto: CreateClinicalSessionDto, @CurrentUser() user: User) {
    return this.clinicalSessionsService.create(dto, user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  find(
    @Query('appointmentId') appointmentId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: User,
  ) {
    if (appointmentId) {
      return this.clinicalSessionsService.findByAppointmentId(appointmentId);
    }
    if (startDate && endDate) {
      return this.clinicalSessionsService.findAll(startDate, endDate);
    }
    return this.clinicalSessionsService.findAll();
  }
}
