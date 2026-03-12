import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { Exercise } from './exercise.entity';
import { ExerciseCompletion } from './exercise-completion.entity';

@Entity('patient_exercises')
export class PatientExercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ name: 'exercise_id', type: 'uuid' })
  exerciseId: string;

  @ManyToOne(() => Exercise, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @Column({ nullable: true })
  frequency: string | null;

  @Column({ name: 'duration_days', type: 'int', nullable: true })
  durationDays: number | null;

  @Column({ name: 'is_completed', default: false })
  isCompleted: boolean;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'assigned_by', type: 'uuid', nullable: true })
  assignedBy: string | null;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;

  @OneToMany(() => ExerciseCompletion, (c) => c.patientExercise)
  completions: ExerciseCompletion[];
}
