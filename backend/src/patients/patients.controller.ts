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
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(
    private patientsService: PatientsService,
    private clinicalSessionsService: ClinicalSessionsService,
    private exercisesService: ExercisesService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  create(@Body() dto: CreatePatientDto) {
    return this.patientsService.create(dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (search !== undefined || page !== undefined || limit !== undefined) {
      return this.patientsService.findWithSearch({
        search,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
    }
    return this.patientsService.findAll();
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  getStats() {
    return this.patientsService.getStats();
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
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.update(id, dto);
  }
}
