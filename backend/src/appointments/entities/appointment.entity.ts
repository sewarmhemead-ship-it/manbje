import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { Room } from '../../rooms/entities/room.entity';
import { Equipment } from '../../equipment/entities/equipment.entity';

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum ArrivalType {
  SELF_ARRIVAL = 'self_arrival',
  CENTER_TRANSPORT = 'center_transport',
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'doctor_id', type: 'uuid' })
  doctorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: User;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  @ManyToOne(() => Room, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ name: 'equipment_id', type: 'uuid', nullable: true })
  equipmentId: string | null;

  @ManyToOne(() => Equipment, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment | null;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp' })
  endTime: Date;

  @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.SCHEDULED })
  status: AppointmentStatus;

  @Column({ name: 'arrival_type', type: 'enum', enum: ArrivalType, default: ArrivalType.SELF_ARRIVAL })
  arrivalType: ArrivalType;

  @Column({ name: 'transport_request_id', type: 'uuid', nullable: true })
  transportRequestId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'patient_rating', type: 'int', nullable: true })
  patientRating: number | null;

  @Column({ name: 'patient_comment', type: 'text', nullable: true })
  patientComment: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
