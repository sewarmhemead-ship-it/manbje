import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

export enum DrugForm {
  TABLET = 'tablet',
  INJECTION = 'injection',
  CREAM = 'cream',
  SYRUP = 'syrup',
  PATCH = 'patch',
  INHALER = 'inhaler',
  OTHER = 'other',
}

export enum DrugCategory {
  ANALGESIC = 'analgesic',
  ANTI_INFLAMMATORY = 'anti_inflammatory',
  MUSCLE_RELAXANT = 'muscle_relaxant',
  CORTICOSTEROID = 'corticosteroid',
  ANTIBIOTIC = 'antibiotic',
  VITAMIN = 'vitamin',
  OTHER = 'other',
}

@Entity('drugs')
export class Drug {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'name_ar' })
  nameAr: string;

  @Column({ name: 'name_en' })
  nameEn: string;

  @Column({ name: 'generic_name', nullable: true })
  genericName: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'default_dose' })
  defaultDose: number;

  @Column({ name: 'dose_unit' })
  doseUnit: string;

  @Column({
    type: 'enum',
    enum: DrugForm,
    default: DrugForm.TABLET,
  })
  form: DrugForm;

  @Column({
    type: 'enum',
    enum: DrugCategory,
    default: DrugCategory.OTHER,
  })
  category: DrugCategory;

  @Column({ name: 'side_effects', type: 'text', nullable: true })
  sideEffects: string | null;

  @Column({ type: 'text', nullable: true })
  contraindications: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
