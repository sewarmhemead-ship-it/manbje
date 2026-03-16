import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Prescription, PrescriptionStatus } from './entities/prescription.entity';
import { PrescriptionItem } from './entities/prescription-item.entity';
import { Drug, DrugCategory } from './entities/drug.entity';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectRepository(Prescription)
    private rxRepo: Repository<Prescription>,
    @InjectRepository(PrescriptionItem)
    private itemRepo: Repository<PrescriptionItem>,
    @InjectRepository(Drug)
    private drugRepo: Repository<Drug>,
  ) {}

  async generateRxNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RX-${year}-`;
    const qb = this.rxRepo
      .createQueryBuilder('p')
      .where('p.rx_number LIKE :prefix', { prefix: prefix + '%' })
      .orderBy('p.rx_number', 'DESC');
    if (companyId) qb.andWhere('p.company_id = :companyId', { companyId });
    const last = await qb.getOne();
    const nextNum = last
      ? parseInt(last.rxNumber.replace(prefix, ''), 10) + 1
      : 1;
    return prefix + String(nextNum).padStart(4, '0');
  }

  async create(dto: CreatePrescriptionDto, doctorId: string, companyId: string): Promise<Prescription> {
    const rxNumber = await this.generateRxNumber(companyId);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const prescription = this.rxRepo.create({
      companyId,
      rxNumber,
      patientId: dto.patientId,
      doctorId,
      appointmentId: dto.appointmentId ?? null,
      diagnosis: dto.diagnosis ?? null,
      instructions: dto.instructions ?? null,
      notes: dto.notes ?? null,
      status: PrescriptionStatus.ACTIVE,
      expiresAt,
    });
    const saved = await this.rxRepo.save(prescription);

    for (const it of dto.items) {
      const item = this.itemRepo.create({
        prescriptionId: saved.id,
        drugId: it.drugId,
        dose: it.dose,
        doseUnit: it.doseUnit,
        frequency: it.frequency,
        durationDays: it.durationDays,
        timing: it.timing ?? null,
        notes: it.notes ?? null,
      });
      await this.itemRepo.save(item);
    }

    return this.findOne(saved.id);
  }

  async findAll(filters: {
    companyId?: string | null;
    patientId?: string;
    doctorId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<Prescription[]> {
    const qb = this.rxRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.patient', 'patient')
      .leftJoinAndSelect('patient.user', 'patientUser')
      .leftJoinAndSelect('p.doctor', 'doctor')
      .leftJoinAndSelect('p.items', 'items')
      .leftJoinAndSelect('items.drug', 'drug')
      .orderBy('p.created_at', 'DESC');

    if (filters.companyId) qb.andWhere('p.company_id = :companyId', { companyId: filters.companyId });
    if (filters.patientId) qb.andWhere('p.patient_id = :patientId', { patientId: filters.patientId });
    if (filters.doctorId) qb.andWhere('p.doctor_id = :doctorId', { doctorId: filters.doctorId });
    if (filters.status) qb.andWhere('p.status = :status', { status: filters.status });
    if (filters.startDate) qb.andWhere('p.created_at >= :startDate', { startDate: filters.startDate });
    if (filters.endDate) qb.andWhere('p.created_at <= :endDate', { endDate: filters.endDate + 'T23:59:59.999Z' });
    if (filters.limit) qb.take(filters.limit);

    return qb.getMany();
  }

  async findOne(id: string, companyId?: string | null): Promise<Prescription> {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const p = await this.rxRepo.findOne({
      where,
      relations: { patient: { user: true }, doctor: true, appointment: true, items: { drug: true } },
    });
    if (!p) throw new NotFoundException('Prescription not found');
    return p;
  }

  async updateStatus(id: string, status: PrescriptionStatus, companyId?: string | null): Promise<Prescription> {
    const p = await this.findOne(id, companyId);
    p.status = status;
    return this.rxRepo.save(p);
  }

  async getStats(companyId?: string | null): Promise<{
    totalThisMonth: number;
    activePrescriptions: number;
    mostPrescribedDrug: string;
    interactionWarnings: number;
  }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const qbMonth = this.rxRepo.createQueryBuilder('p').where('p.created_at >= :start', { start: monthStart }).andWhere('p.created_at <= :end', { end: monthEnd });
    const qbActive = this.rxRepo.createQueryBuilder('p').where('p.status = :status', { status: PrescriptionStatus.ACTIVE });
    if (companyId) {
      qbMonth.andWhere('p.company_id = :companyId', { companyId });
      qbActive.andWhere('p.company_id = :companyId', { companyId });
    }
    const [totalThisMonth, activePrescriptions, allItems] = await Promise.all([
      qbMonth.getCount(),
      qbActive.getCount(),
      this.itemRepo.find({ relations: { drug: true } }),
    ]);

    const drugCounts: Record<string, number> = {};
    for (const it of allItems) {
      const name = it.drug?.nameAr ?? '—';
      drugCounts[name] = (drugCounts[name] ?? 0) + 1;
    }
    const mostPrescribedDrug =
      Object.entries(drugCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

    return {
      totalThisMonth,
      activePrescriptions,
      mostPrescribedDrug,
      interactionWarnings: 0,
    };
  }

  async checkInteractions(drugIds: string[]): Promise<string[]> {
    if (drugIds.length < 2) return [];
    const drugs = await this.drugRepo.find({ where: { id: In(drugIds) } });
    const categories = new Set(drugs.map((d) => d.category));
    const names = new Set(drugs.map((d) => d.nameEn?.toLowerCase() ?? ''));

    const warnings: string[] = [];

    if (categories.has(DrugCategory.ANTI_INFLAMMATORY) && categories.has(DrugCategory.CORTICOSTEROID)) {
      warnings.push('تحذير: خطر نزيف معدي — مضادات التهاب مع كورتيكوستيرويد');
    }
    const muscleCount = drugs.filter((d) => d.category === DrugCategory.MUSCLE_RELAXANT).length;
    if (muscleCount >= 2) {
      warnings.push('تحذير: تضاعف التخدير — أكثر من مرخي عضلي واحد');
    }
    if (names.has('tramadol') && names.has('amitriptyline')) {
      warnings.push('تحذير: خطر متلازمة السيروتونين — ترامادول مع أميتريبتيلين');
    }

    return warnings;
  }
}
