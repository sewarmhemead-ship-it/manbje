import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private patientsRepo: Repository<Patient>,
  ) {}

  async create(dto: CreatePatientDto, companyId: string): Promise<Patient> {
    const patient = this.patientsRepo.create({
      companyId,
      userId: dto.userId ?? undefined,
      nameAr: dto.nameAr,
      nameEn: dto.nameEn ?? null,
      birthDate: dto.birthDate ?? null,
      gender: dto.gender ?? null,
      phone: dto.phone,
      email: dto.email ?? null,
      address: dto.address ?? null,
      emergencyContactName: dto.emergencyContactName ?? null,
      emergencyContactPhone: dto.emergencyContactPhone ?? null,
      insuranceCompany: dto.insuranceCompany ?? null,
      insurancePolicyNumber: dto.insurancePolicyNumber ?? null,
      diagnosis: dto.diagnosis ?? null,
      assignedDoctorId: dto.assignedDoctorId ?? null,
      arrivalPreference: dto.arrivalPreference ?? null,
      mobilityAid: dto.mobilityAid ?? null,
      notes: dto.notes ?? null,
    });
    return this.patientsRepo.save(patient);
  }

  async findAll(companyId?: string | null): Promise<Patient[]> {
    const where = companyId ? { companyId } : {};
    return this.patientsRepo.find({
      where,
      relations: { user: true, assignedDoctor: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findWithSearch(options: {
    search?: string;
    page?: number;
    limit?: number;
    companyId?: string | null;
  }): Promise<{ data: Patient[]; total: number }> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 12));
    const skip = (page - 1) * limit;

    const qb = this.patientsRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'user')
      .leftJoinAndSelect('p.assignedDoctor', 'assignedDoctor')
      .orderBy('p.created_at', 'DESC');

    if (options.companyId) {
      qb.andWhere('p.company_id = :companyId', { companyId: options.companyId });
    }
    if (options.search?.trim()) {
      const term = `%${options.search.trim()}%`;
      qb.andWhere(
        '(p.name_ar ILIKE :term OR p.name_en ILIKE :term OR p.phone ILIKE :term OR p.email ILIKE :term)',
        { term },
      );
    }

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { data, total };
  }

  async getStats(companyId?: string | null): Promise<{ total: number; activeThisMonth: number; newThisWeek: number }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const baseQb = () => {
      const q = this.patientsRepo.createQueryBuilder('p');
      if (companyId) q.where('p.company_id = :companyId', { companyId });
      return q;
    };
    const total = await baseQb().getCount();
    const newThisWeek = await baseQb().andWhere('p.created_at >= :weekAgo', { weekAgo }).getCount();
    const activeResult = await this.patientsRepo.manager.query(
      `SELECT COUNT(DISTINCT cs.patient_id) AS c FROM clinical_sessions cs
       INNER JOIN appointments a ON a.id = cs.appointment_id
       WHERE cs.created_at >= $1 ${companyId ? 'AND a.company_id = $2' : ''}`,
      companyId ? [monthStart, companyId] : [monthStart],
    );
    const activeThisMonth = parseInt(activeResult?.[0]?.c ?? '0', 10);
    return { total, activeThisMonth, newThisWeek };
  }

  async findOne(id: string, companyId?: string | null): Promise<Patient> {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const patient = await this.patientsRepo.findOne({
      where,
      relations: { user: true, assignedDoctor: true },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  async findByUserId(userId: string): Promise<Patient | null> {
    return this.patientsRepo.findOne({
      where: { userId },
      relations: { user: true },
    });
  }

  async update(id: string, dto: UpdatePatientDto): Promise<Patient> {
    const patient = await this.findOne(id);
    Object.assign(patient, dto);
    return this.patientsRepo.save(patient);
  }

  async updatePushToken(patientId: string, token: string): Promise<Patient> {
    const patient = await this.patientsRepo.findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');
    patient.pushToken = token;
    return this.patientsRepo.save(patient);
  }
}
