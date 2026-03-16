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
import { requireCompanyId } from '../common/company-id';
import { User, UserRole } from '../users/entities/user.entity';
import { PatientsService } from '../patients/patients.service';
import { AuditService } from '../audit/audit.service';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(
    private appointmentsService: AppointmentsService,
    private patientsService: PatientsService,
    private auditService: AuditService,
  ) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermission('appointments_create')
  async create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: User) {
    const companyId = requireCompanyId(user);
    const appointment = await this.appointmentsService.create(dto, companyId);
    await this.auditService.log({
      userId: user.id,
      companyId,
      action: 'create',
      entityType: 'appointment',
      entityId: appointment.id,
      details: { patientId: dto.patientId, startTime: appointment.startTime },
    });
    return appointment;
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
    const companyId = requireCompanyId(user);
    if (user.role === UserRole.DOCTOR) {
      return this.appointmentsService.findByDoctor(user.id, startDate, endDate, companyId);
    }
    return this.appointmentsService.findAllInRange(startDate, endDate, companyId);
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
    const companyId = requireCompanyId(user);
    const start = startDate || new Date().toISOString().slice(0, 10);
    const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return this.appointmentsService.findByDoctor(doctorId, start, end, companyId);
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
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @CurrentUser() user: User,
  ) {
    const appointment = await this.appointmentsService.updateStatus(id, dto.status);
    await this.auditService.log({
      userId: user.id,
      companyId: appointment.companyId ?? null,
      action: 'update_status',
      entityType: 'appointment',
      entityId: id,
      details: { status: dto.status },
    });
    return appointment;
  }

  @Patch(':id/rating')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  async rate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { stars: number; comment?: string },
    @CurrentUser() user: User,
  ) {
    const myPatient = await this.patientsService.findByUserId(user.id);
    if (!myPatient) throw new ForbiddenException('Patient profile not found');
    return this.appointmentsService.rate(id, myPatient.id, body.stars, body.comment ?? null);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  async cancelByPatient(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const myPatient = await this.patientsService.findByUserId(user.id);
    if (!myPatient) throw new ForbiddenException('Patient profile not found');
    return this.appointmentsService.cancelByPatient(id, myPatient.id);
  }

  @Patch(':id/note')
  @UseGuards(PermissionsGuard)
  @RequirePermission('appointments_append_note')
  appendNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { note: string },
  ) {
    return this.appointmentsService.appendNote(id, body.note ?? '').then(() => ({}));
  }
}
