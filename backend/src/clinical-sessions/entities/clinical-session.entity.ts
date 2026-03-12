import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Appointment } from '../../appointments/entities/appointment.entity';

@Entity('clinical_sessions')
export class ClinicalSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'appointment_id', type: 'uuid', unique: true })
  appointmentId: string;

  @OneToOne(() => Appointment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @Column({ type: 'text', nullable: true })
  subjective: string | null;

  @Column({ type: 'text', nullable: true })
  objective: string | null;

  @Column({ type: 'text', nullable: true })
  assessment: string | null;

  @Column({ type: 'text', nullable: true })
  plan: string | null;

  /** مقياس التحسن 0–100 */
  @Column({ name: 'recovery_score', type: 'smallint', nullable: true })
  recoveryScore: number | null;

  @Column({ name: 'therapist_notes', type: 'text', nullable: true })
  therapistNotes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
