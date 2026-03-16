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
import { PrescriptionsService } from './prescriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { requireCompanyId } from '../common/company-id';
import { User, UserRole } from '../users/entities/user.entity';
import { PatientsService } from '../patients/patients.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { PrescriptionStatus } from './entities/prescription.entity';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard)
export class PrescriptionsController {
  constructor(
    private prescriptionsService: PrescriptionsService,
    private patientsService: PatientsService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  findAll(
    @CurrentUser() user: User,
    @Query('patientId') patientId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const companyId = requireCompanyId(user);
    return this.prescriptionsService.findAll({
      companyId,
      patientId,
      doctorId,
      status,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  getStats(@CurrentUser() user: User) {
    return this.prescriptionsService.getStats(requireCompanyId(user));
  }

  @Get('patient/:patientId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  async findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: User,
  ) {
    if (user.role === UserRole.PATIENT) {
      const myPatient = await this.patientsService.findByUserId(user.id);
      if (!myPatient || myPatient.id !== patientId) {
        throw new ForbiddenException('You can only view your own prescriptions');
      }
      return this.prescriptionsService.findAll({ patientId });
    }
    return this.prescriptionsService.findAll({ companyId: requireCompanyId(user), patientId });
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    const companyId = user.role === UserRole.PATIENT ? null : requireCompanyId(user);
    const rx = await this.prescriptionsService.findOne(id, companyId ?? undefined);
    if (user.role === UserRole.PATIENT) {
      const myPatient = await this.patientsService.findByUserId(user.id);
      if (!myPatient || rx.patientId !== myPatient.id) {
        throw new ForbiddenException('You can only view your own prescriptions');
      }
    }
    return rx;
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  create(@Body() dto: CreatePrescriptionDto, @CurrentUser() user: User) {
    return this.prescriptionsService.create(dto, user.id, requireCompanyId(user));
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: PrescriptionStatus,
    @CurrentUser() user: User,
  ) {
    return this.prescriptionsService.updateStatus(id, status, requireCompanyId(user));
  }

  @Post('check-interactions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  checkInteractions(@Body('drugIds') drugIds: string[]) {
    return this.prescriptionsService.checkInteractions(Array.isArray(drugIds) ? drugIds : []);
  }
}
