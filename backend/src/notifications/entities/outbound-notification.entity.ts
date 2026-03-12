import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

export type OutboundChannel = 'whatsapp' | 'sms' | 'app';
export type OutboundStatus = 'pending' | 'sent' | 'failed' | 'delivered';

@Entity('outbound_notifications')
export class OutboundNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column()
  type: string;

  @Column({ type: 'varchar', length: 20 })
  channel: OutboundChannel;

  @Column({ type: 'text', name: 'message_ar' })
  messageAr: string;

  @Column({ type: 'text', name: 'message_vars', nullable: true })
  messageVars: string | null;

  @Column({ default: 'pending' })
  status: OutboundStatus;

  @Column({ name: 'external_id', nullable: true })
  externalId: string | null;

  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'appointment_id', type: 'uuid', nullable: true })
  appointmentId: string | null;

  @ManyToOne(() => Appointment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
