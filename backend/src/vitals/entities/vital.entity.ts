import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';

@Entity('vitals')
export class Vital {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ name: 'recorded_by_id', type: 'uuid' })
  recordedById: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recorded_by_id' })
  recordedBy: User;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  heartRate: number | null;

  @Column({ name: 'blood_pressure', nullable: true })
  bloodPressure: string | null;

  @Column({ name: 'oxygen_saturation', type: 'decimal', precision: 5, scale: 2, nullable: true })
  oxygenSaturation: number | null;

  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  temperature: number | null;

  @Column({ name: 'pain_level', type: 'int', nullable: true })
  painLevel: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt: Date;
}
