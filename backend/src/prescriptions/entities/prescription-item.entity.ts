import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Prescription } from './prescription.entity';
import { Drug } from './drug.entity';

@Entity('prescription_items')
export class PrescriptionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'prescription_id', type: 'uuid' })
  prescriptionId: string;

  @ManyToOne(() => Prescription, (p) => p.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prescription_id' })
  prescription: Prescription;

  @Column({ name: 'drug_id', type: 'uuid' })
  drugId: string;

  @ManyToOne(() => Drug, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'drug_id' })
  drug: Drug;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  dose: number;

  @Column({ name: 'dose_unit' })
  doseUnit: string;

  @Column()
  frequency: string;

  @Column({ name: 'duration_days', type: 'int' })
  durationDays: number;

  @Column({ type: 'varchar', nullable: true })
  timing: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
