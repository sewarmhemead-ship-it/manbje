import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Company } from '../../companies/entities/company.entity';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'user_id', type: 'uuid', unique: true, nullable: true })
  userId: string | null;

  @OneToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'name_ar' })
  nameAr: string;

  @Column({ name: 'name_en', nullable: true })
  nameEn: string | null;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: string | null;

  @Column({ nullable: true })
  gender: string | null;

  @Column()
  phone: string;

  @Column({ nullable: true })
  email: string | null;

  @Column({ nullable: true })
  address: string | null;

  @Column({ name: 'emergency_contact_name', nullable: true })
  emergencyContactName: string | null;

  @Column({ name: 'emergency_contact_phone', nullable: true })
  emergencyContactPhone: string | null;

  @Column({ name: 'insurance_company', nullable: true })
  insuranceCompany: string | null;

  @Column({ name: 'insurance_policy_number', nullable: true })
  insurancePolicyNumber: string | null;

  @Column({ type: 'text', nullable: true })
  diagnosis: string | null;

  @Column({ name: 'assigned_doctor_id', type: 'uuid', nullable: true })
  assignedDoctorId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_doctor_id' })
  assignedDoctor: User | null;

  @Column({ name: 'arrival_preference', nullable: true })
  arrivalPreference: string | null;

  @Column({ name: 'mobility_aid', nullable: true })
  mobilityAid: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'push_token', type: 'text', nullable: true })
  pushToken: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
