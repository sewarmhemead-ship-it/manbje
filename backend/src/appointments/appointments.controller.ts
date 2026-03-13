import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { PatientsService } from '../patients/patients.service';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(
    private appointmentsService: AppointmentsService,
    private patientsService: PatientsService,
  ) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermission('appointments_create')
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermission('appointments_view')
  async findAll(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: User,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    if (user.role === UserRole.DOCTOR) {
      return this.appointmentsService.findByDoctor(user.id, startDate, endDate);
    }
    return this.appointmentsService.findAllInRange(startDate, endDate);
  }

  @Get('doctor/:doctorId')
  @UseGuards(PermissionsGuard)
  @RequirePermission('appointments_view')
  async findByDoctor(
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: User,
  ) {
    if (user.role === UserRole.DOCTOR && doctorId !== user.id) {
      throw new ForbiddenException('You can only view your own schedule');
    }
    const start = startDate || new Date().toISOString().slice(0, 10);
    const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return this.appointmentsService.findByDoctor(doctorId, start, end);
  }

  @Get('patient/:patientId')
  @UseGuards(PermissionsGuard)
  @RequirePermission('appointments_view')
  async findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('status') status: string,
    @Query('limit') limit: string,
    @CurrentUser() user: User,
  ) {
    if (user.role === UserRole.PATIENT) {
      const myPatient = await this.patientsService.findByUserId(user.id);
      if (!myPatient || myPatient.id !== patientId) {
        throw new ForbiddenException('You can only view your own appointments');
      }
    }
    return this.appointmentsService.findByPatient(patientId, status || undefined, limit ? parseInt(limit, 10) : undefined);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('appointments_view')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const appointment = await this.appointmentsService.findOne(id);
    if (user.role === UserRole.PATIENT) {
      const myPatient = await this.patientsService.findByUserId(user.id);
      if (!myPatient || appointment.patientId !== myPatient.id) {
        throw new ForbiddenException('You can only view your own appointments');
      }
    }
    if (user.role === UserRole.DOCTOR && appointment.doctorId !== user.id) {
      throw new ForbiddenException('You can only view your own schedule');
    }
    return appointment;
  }

  @Patch(':id/status')
  @UseGuards(PermissionsGuard)
  @RequirePermission('appointments_edit')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(id, dto.status);
  }
}
