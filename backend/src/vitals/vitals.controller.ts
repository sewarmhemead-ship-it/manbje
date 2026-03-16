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
import { VitalsService } from './vitals.service';
import { CreateVitalDto } from './dto/create-vital.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { PatientsService } from '../patients/patients.service';
import { requireCompanyId } from '../common/company-id';

@Controller('vitals')
@UseGuards(JwtAuthGuard)
export class VitalsController {
  constructor(
    private vitalsService: VitalsService,
    private patientsService: PatientsService,
  ) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermission('vitals_create')
  create(@Body() dto: CreateVitalDto, @CurrentUser() user: User) {
    return this.vitalsService.create(dto, user.id);
  }

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  async findMyVitals(@CurrentUser() user: User, @Query('limit') limit?: string) {
    const patient = await this.patientsService.findByUserId(user.id);
    if (!patient) throw new ForbiddenException('Patient profile not found');
    const lim = limit ? parseInt(limit, 10) : 10;
    return this.vitalsService.findByPatient(patient.id, lim);
  }

  @Get(':patientId')
  @UseGuards(PermissionsGuard)
  @RequirePermission('vitals_view')
  async findByPatient(
    @CurrentUser() user: User,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('limit') limit?: string,
  ) {
    const companyId = requireCompanyId(user);
    await this.patientsService.findOne(patientId, companyId);
    const lim = limit ? parseInt(limit, 10) : 10;
    return this.vitalsService.findByPatient(patientId, lim);
  }

  @Get(':patientId/latest')
  @UseGuards(PermissionsGuard)
  @RequirePermission('vitals_view')
  async findLatest(
    @CurrentUser() user: User,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    const companyId = requireCompanyId(user);
    await this.patientsService.findOne(patientId, companyId);
    return this.vitalsService.findLatest(patientId);
  }
}
