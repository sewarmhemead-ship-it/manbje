import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exercise } from './entities/exercise.entity';
import { PatientExercise } from './entities/patient-exercise.entity';
import { ExerciseCompletion } from './entities/exercise-completion.entity';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { CreatePatientExerciseDto } from './dto/create-patient-exercise.dto';
import { PatientsService } from '../patients/patients.service';

@Injectable()
export class ExercisesService {
  constructor(
    @InjectRepository(Exercise)
    private exercisesRepo: Repository<Exercise>,
    @InjectRepository(PatientExercise)
    private patientExercisesRepo: Repository<PatientExercise>,
    @InjectRepository(ExerciseCompletion)
    private completionsRepo: Repository<ExerciseCompletion>,
    private patientsService: PatientsService,
  ) {}

  async createExercise(dto: CreateExerciseDto, companyId: string): Promise<Exercise> {
    const exercise = this.exercisesRepo.create({
      companyId,
      name: dto.name,
      description: dto.description ?? null,
      videoUrl: dto.videoUrl ?? null,
      targetMuscles: dto.targetMuscles ?? null,
    });
    return this.exercisesRepo.save(exercise);
  }

  async findAllExercises(companyId?: string | null): Promise<Exercise[]> {
    const where = companyId ? { companyId } : {};
    return this.exercisesRepo.find({ where, order: { name: 'ASC' } });
  }

  async findOneExercise(id: string, companyId?: string | null): Promise<Exercise> {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const exercise = await this.exercisesRepo.findOne({ where });
    if (!exercise) throw new NotFoundException('Exercise not found');
    return exercise;
  }

  async assignToPatient(dto: CreatePatientExerciseDto, assignedBy: string, companyId: string): Promise<PatientExercise> {
    await this.patientsService.findOne(dto.patientId, companyId);
    await this.findOneExercise(dto.exerciseId, companyId);
    const pe = this.patientExercisesRepo.create({
      patientId: dto.patientId,
      exerciseId: dto.exerciseId,
      frequency: dto.frequency ?? null,
      durationDays: dto.durationDays ?? null,
      assignedBy,
    });
    return this.patientExercisesRepo.save(pe);
  }

  async findByPatient(patientId: string): Promise<PatientExercise[]> {
    return this.patientExercisesRepo.find({
      where: { patientId, isCompleted: false },
      relations: { exercise: true },
      order: { assignedAt: 'DESC' },
    });
  }

  async findPatientExercisesWithCompletions(patientId: string): Promise<PatientExercise[]> {
    return this.patientExercisesRepo.find({
      where: { patientId },
      relations: { exercise: true, completions: true },
      order: { assignedAt: 'DESC' },
    });
  }

  async markCompleted(patientExerciseId: string, userId: string): Promise<PatientExercise> {
    const pe = await this.patientExercisesRepo.findOne({
      where: { id: patientExerciseId },
      relations: { patient: true },
    });
    if (!pe) throw new NotFoundException('Patient exercise assignment not found');
    pe.isCompleted = true;
    pe.completedAt = new Date();
    return this.patientExercisesRepo.save(pe);
  }

  async addCompletion(patientExerciseId: string): Promise<ExerciseCompletion> {
    const pe = await this.patientExercisesRepo.findOne({
      where: { id: patientExerciseId },
    });
    if (!pe) throw new NotFoundException('Patient exercise assignment not found');
    const completion = this.completionsRepo.create({
      patientExerciseId,
      completedAt: new Date(),
      confirmedByPatient: true,
    });
    return this.completionsRepo.save(completion);
  }

  async findPatientExerciseById(id: string): Promise<PatientExercise | null> {
    return this.patientExercisesRepo.findOne({
      where: { id },
      relations: { patient: true },
    });
  }
}
