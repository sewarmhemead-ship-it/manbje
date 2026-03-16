import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipment } from './entities/equipment.entity';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private equipmentRepo: Repository<Equipment>,
  ) {}

  async create(dto: CreateEquipmentDto, companyId: string): Promise<Equipment> {
    const equipment = this.equipmentRepo.create({
      companyId,
      name: dto.name,
      description: dto.description ?? null,
      isAvailable: dto.isAvailable ?? true,
    });
    return this.equipmentRepo.save(equipment);
  }

  async findAll(companyId: string | null, availableOnly = false): Promise<Equipment[]> {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (availableOnly) where.isAvailable = true;
    return this.equipmentRepo.find({
      where: Object.keys(where).length ? where : undefined,
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, companyId?: string | null): Promise<Equipment> {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const equipment = await this.equipmentRepo.findOne({ where });
    if (!equipment) throw new NotFoundException('Equipment not found');
    return equipment;
  }

  async update(id: string, dto: UpdateEquipmentDto, companyId?: string | null): Promise<Equipment> {
    const equipment = await this.findOne(id, companyId);
    Object.assign(equipment, dto);
    return this.equipmentRepo.save(equipment);
  }

  async remove(id: string, companyId?: string | null): Promise<void> {
    const equipment = await this.findOne(id, companyId);
    await this.equipmentRepo.remove(equipment);
  }
}
