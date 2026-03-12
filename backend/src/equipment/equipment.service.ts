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

  async create(dto: CreateEquipmentDto): Promise<Equipment> {
    const equipment = this.equipmentRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      isAvailable: dto.isAvailable ?? true,
    });
    return this.equipmentRepo.save(equipment);
  }

  async findAll(availableOnly = false): Promise<Equipment[]> {
    return this.equipmentRepo.find({
      where: availableOnly ? { isAvailable: true } : undefined,
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Equipment> {
    const equipment = await this.equipmentRepo.findOne({ where: { id } });
    if (!equipment) throw new NotFoundException('Equipment not found');
    return equipment;
  }

  async update(id: string, dto: UpdateEquipmentDto): Promise<Equipment> {
    const equipment = await this.findOne(id);
    Object.assign(equipment, dto);
    return this.equipmentRepo.save(equipment);
  }

  async remove(id: string): Promise<void> {
    const equipment = await this.findOne(id);
    await this.equipmentRepo.remove(equipment);
  }
}
