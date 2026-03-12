import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exercise } from './entities/exercise.entity';
import { PatientExercise } from './entities/patient-exercise.entity';
import { ExerciseCompletion } from './entities/exercise-completion.entity';
import { ExercisesService } from './exercises.service';
import { ExercisesController } from './exercises.controller';
import { PatientExerciseActionsController } from './exercises.controller';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exercise, PatientExercise, ExerciseCompletion]),
    forwardRef(() => PatientsModule),
  ],
  providers: [ExercisesService],
  controllers: [ExercisesController, PatientExerciseActionsController],
  exports: [ExercisesService],
})
export class ExercisesModule {}
