import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum VehicleAccommodationType {
  WHEELCHAIR = 'wheelchair',
  STRETCHER = 'stretcher',
  WALKING = 'walking',
  ALL = 'all',
}

@Entity('transport_vehicles')
export class TransportVehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'plate_number', unique: true })
  plateNumber: string;

  @Column({ name: 'vehicle_type', nullable: true })
  vehicleType: string | null;

  @Column({
    name: 'accommodation_type',
    type: 'enum',
    enum: VehicleAccommodationType,
    default: VehicleAccommodationType.ALL,
  })
  accommodationType: VehicleAccommodationType;

  @Column({ type: 'int', default: 4 })
  capacity: number;

  @Column({ default: 'available' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
