import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { ClinicalSession } from '../../clinical-sessions/entities/clinical-session.entity';

export enum AttachmentFileType {
  X_RAY = 'xray',
  MRI = 'mri',
  REPORT = 'report',
}

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId: string | null;

  @ManyToOne(() => ClinicalSession, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'session_id' })
  session: ClinicalSession | null;

  @Column({ name: 'file_url' })
  fileUrl: string;

  @Column({ name: 'file_type', type: 'enum', enum: AttachmentFileType })
  fileType: AttachmentFileType;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'original_name', nullable: true })
  originalName: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
