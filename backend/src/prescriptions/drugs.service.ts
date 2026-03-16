import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Drug, DrugForm, DrugCategory } from './entities/drug.entity';
import { CreateDrugDto } from './dto/create-drug.dto';

@Injectable()
export class DrugsService {
  constructor(
    @InjectRepository(Drug)
    private drugRepo: Repository<Drug>,
  ) {}

  async findAll(companyId: string | null, search?: string, category?: string, form?: string): Promise<Drug[]> {
    const qb = this.drugRepo.createQueryBuilder('d').where('d.is_active = :active', { active: true });
    if (companyId) qb.andWhere('d.company_id = :companyId', { companyId });
    if (search?.trim()) {
      qb.andWhere(
        '(d.name_ar ILIKE :search OR d.name_en ILIKE :search OR d.generic_name ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }
    if (category) qb.andWhere('d.category = :category', { category });
    if (form) qb.andWhere('d.form = :form', { form });
    qb.orderBy('d.name_ar', 'ASC');
    return qb.getMany();
  }

  async create(dto: CreateDrugDto, companyId: string): Promise<Drug> {
    const drug = this.drugRepo.create({
      companyId,
      nameAr: dto.nameAr,
      nameEn: dto.nameEn,
      genericName: dto.genericName ?? null,
      defaultDose: dto.defaultDose,
      doseUnit: dto.doseUnit,
      form: dto.form,
      category: dto.category,
      sideEffects: dto.sideEffects ?? null,
      contraindications: dto.contraindications ?? null,
      notes: dto.notes ?? null,
      isActive: dto.isActive ?? true,
    });
    return this.drugRepo.save(drug);
  }

  async findOne(id: string, companyId?: string | null): Promise<Drug> {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const drug = await this.drugRepo.findOne({ where });
    if (!drug) throw new NotFoundException('Drug not found');
    return drug;
  }

  async update(id: string, dto: Partial<CreateDrugDto>, companyId?: string | null): Promise<Drug> {
    const drug = await this.findOne(id, companyId);
    Object.assign(drug, dto);
    return this.drugRepo.save(drug);
  }

  async toggleActive(id: string, companyId?: string | null): Promise<Drug> {
    const drug = await this.findOne(id, companyId);
    drug.isActive = !drug.isActive;
    return this.drugRepo.save(drug);
  }
}
