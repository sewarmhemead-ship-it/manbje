import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PatientExercise } from './patient-exercise.entity';

@Entity('exercise_completions')
export class ExerciseCompletion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_exercise_id', type: 'uuid' })
  patientExerciseId: string;

  @ManyToOne(() => PatientExercise, (pe) => pe.completions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_exercise_id' })
  patientExercise: PatientExercise;

  @Column({ name: 'completed_at', type: 'timestamp' })
  completedAt: Date;

  @Column({ name: 'confirmed_by_patient', default: true })
  confirmedByPatient: boolean;
}
