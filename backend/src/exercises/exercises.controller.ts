import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { CreatePatientExerciseDto } from './dto/create-patient-exercise.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@Controller('exercises')
@UseGuards(JwtAuthGuard)
export class ExercisesController {
  constructor(private exercisesService: ExercisesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  createExercise(@Body() dto: CreateExerciseDto) {
    return this.exercisesService.createExercise(dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  findAllExercises() {
    return this.exercisesService.findAllExercises();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  findOneExercise(@Param('id', ParseUUIDPipe) id: string) {
    return this.exercisesService.findOneExercise(id);
  }

  @Post('assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  assignToPatient(@Body() dto: CreatePatientExerciseDto, @CurrentUser() user: User) {
    return this.exercisesService.assignToPatient(dto, user.id);
  }
}

@Controller('patient-exercises')
@UseGuards(JwtAuthGuard)
export class PatientExerciseActionsController {
  constructor(private exercisesService: ExercisesService) {}

  @Post(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  async markCompleted(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const pe = await this.exercisesService.findPatientExerciseById(id);
    if (!pe) throw new NotFoundException('Assignment not found');
    if (pe.patient.userId !== user.id) {
      throw new ForbiddenException('You can only update your own exercises');
    }
    return this.exercisesService.markCompleted(id, user.id);
  }

  @Post(':id/completions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  async addCompletion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const pe = await this.exercisesService.findPatientExerciseById(id);
    if (!pe) throw new NotFoundException('Assignment not found');
    if (pe.patient.userId !== user.id) {
      throw new ForbiddenException('You can only log completions for your own exercises');
    }
    return this.exercisesService.addCompletion(id);
  }
}
