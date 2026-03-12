import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ClinicalSessionsService } from './clinical-sessions.service';
import { CreateClinicalSessionDto } from './dto/create-clinical-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { PatientsService } from '../patients/patients.service';

@Controller('clinical-sessions')
@UseGuards(JwtAuthGuard)
export class ClinicalSessionsController {
  constructor(
    private clinicalSessionsService: ClinicalSessionsService,
    private patientsService: PatientsService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  create(@Body() dto: CreateClinicalSessionDto, @CurrentUser() user: User) {
    return this.clinicalSessionsService.create(dto, user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  async find(
    @Query('appointmentId') appointmentId: string,
    @Query('patientId') patientId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit: string,
    @CurrentUser() user: User,
  ) {
    if (user.role === UserRole.PATIENT) {
      const myPatient = await this.patientsService.findByUserId(user.id);
      if (!myPatient || !patientId || myPatient.id !== patientId) {
        throw new ForbiddenException('You can only view your own sessions');
      }
      const sessions = await this.clinicalSessionsService.findByPatientId(patientId);
      const lim = limit ? parseInt(limit, 10) : sessions.length;
      return sessions.slice(0, lim);
    }
    if (appointmentId) {
      return this.clinicalSessionsService.findByAppointmentId(appointmentId);
    }
    if (patientId) {
      const sessions = await this.clinicalSessionsService.findByPatientId(patientId);
      const lim = limit ? parseInt(limit, 10) : sessions.length;
      return sessions.slice(0, lim);
    }
    if (startDate && endDate) {
      return this.clinicalSessionsService.findAll(startDate, endDate);
    }
    return this.clinicalSessionsService.findAll();
  }
}
