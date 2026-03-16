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
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { ClinicalSessionsService } from '../clinical-sessions/clinical-sessions.service';
import { ExercisesService } from '../exercises/exercises.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { requireCompanyId } from '../common/company-id';
import { User, UserRole } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(
    private patientsService: PatientsService,
    private clinicalSessionsService: ClinicalSessionsService,
    private exercisesService: ExercisesService,
    private auditService: AuditService,
  ) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermission('patients_create')
  async create(@Body() dto: CreatePatientDto, @CurrentUser() user: User) {
    const companyId = requireCompanyId(user);
    const patient = await this.patientsService.create(dto, companyId);
    await this.auditService.log({
      userId: user.id,
      companyId,
      action: 'create',
      entityType: 'patient',
      entityId: patient.id,
      details: { nameAr: dto.nameAr },
    });
    return patient;
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermission('patients_view')
  findAll(
    @CurrentUser() user: User,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const companyId = user.role !== UserRole.PATIENT ? requireCompanyId(user) : null;
    if (search !== undefined || page !== undefined || limit !== undefined) {
      return this.patientsService.findWithSearch({
        search,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        companyId,
      });
    }
    return this.patientsService.findAll(companyId ?? undefined);
  }

  @Get('stats')
  @UseGuards(PermissionsGuard)
  @RequirePermission('patients_view')
  getStats(@CurrentUser() user: User) {
    const companyId = user.role !== UserRole.PATIENT ? requireCompanyId(user) : null;
    return this.patientsService.getStats(companyId ?? undefined);
  }

  @Get('me')
  async findMyProfile(@CurrentUser() user: User) {
    if (user.role !== UserRole.PATIENT) {
      return null;
    }
    return this.patientsService.findByUserId(user.id);
  }

  @Get(':id/sessions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  async getSessions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    if (user.role === UserRole.PATIENT) {
      const myPatient = await this.patientsService.findByUserId(user.id);
      if (!myPatient || myPatient.id !== id) {
        throw new ForbiddenException('You can only view your own sessions');
      }
    }
    return this.clinicalSessionsService.findByPatientId(id);
  }

  @Get(':id/progress')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  async getProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    if (user.role === UserRole.PATIENT) {
      const myPatient = await this.patientsService.findByUserId(user.id);
      if (!myPatient || myPatient.id !== id) {
        throw new ForbiddenException('You can only view your own progress');
      }
    }
    return this.clinicalSessionsService.getRecoveryHistory(id);
  }

  @Get(':id/exercises')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  async getExercises(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    if (user.role === UserRole.PATIENT) {
      const myPatient = await this.patientsService.findByUserId(user.id);
      if (!myPatient || myPatient.id !== id) {
        throw new ForbiddenException('You can only view your own exercises');
      }
    }
    return this.exercisesService.findPatientExercisesWithCompletions(id);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    const companyId = requireCompanyId(user);
    return this.patientsService.findOne(id, companyId);
  }

  @Patch(':id/push-token')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  async updatePushToken(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { token: string; platform: 'ios' | 'android' },
    @CurrentUser() user: User,
  ) {
    const myPatient = await this.patientsService.findByUserId(user.id);
    if (!myPatient || myPatient.id !== id) {
      throw new ForbiddenException('You can only update your own push token');
    }
    return this.patientsService.updatePushToken(id, dto.token);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('patients_edit')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: User,
  ) {
    const companyId = requireCompanyId(user);
    await this.patientsService.findOne(id, companyId);
    const patient = await this.patientsService.update(id, dto);
    await this.auditService.log({
      userId: user.id,
      companyId,
      action: 'update',
      entityType: 'patient',
      entityId: id,
      details: Object.keys(dto).length ? { updatedFields: Object.keys(dto) } : null,
    });
    return patient;
  }
}
