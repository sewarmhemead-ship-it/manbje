import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { TransportDriver } from './transport-driver.entity';
import { TransportVehicle } from './transport-vehicle.entity';

export enum TransportCompletionStatus {
  TO_CENTER_ONLY = 'to_center_only',
  FROM_CENTER_ONLY = 'from_center_only',
  ROUND_TRIP = 'round_trip',
}

export enum TransportRequestStatus {
  REQUESTED = 'requested',
  ASSIGNED = 'assigned',
  EN_ROUTE = 'en_route',
  ARRIVED_AT_CENTER = 'arrived_at_center',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum MobilityNeed {
  WHEELCHAIR = 'wheelchair',
  STRETCHER = 'stretcher',
  WALKING = 'walking',
}

@Entity('transport_requests')
export class TransportRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'appointment_id', type: 'uuid', nullable: true })
  appointmentId: string | null;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ name: 'pickup_address' })
  pickupAddress: string;

  @Column({ name: 'pickup_time', type: 'timestamp' })
  pickupTime: Date;

  @Column({
    name: 'completion_status',
    type: 'enum',
    enum: TransportCompletionStatus,
    default: TransportCompletionStatus.TO_CENTER_ONLY,
  })
  completionStatus: TransportCompletionStatus;

  @Column({
    name: 'mobility_need',
    type: 'enum',
    enum: MobilityNeed,
    nullable: true,
  })
  mobilityNeed: MobilityNeed | null;

  @Column({ type: 'enum', enum: TransportRequestStatus, default: TransportRequestStatus.REQUESTED })
  status: TransportRequestStatus;

  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId: string | null;

  @ManyToOne(() => TransportDriver, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driver_id' })
  driver: TransportDriver | null;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId: string | null;

  @ManyToOne(() => TransportVehicle, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: TransportVehicle | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'arrived_at_center', type: 'timestamp', nullable: true })
  arrivedAtCenter: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
