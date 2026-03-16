import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransportDriver } from './entities/transport-driver.entity';

@Injectable()
export class TransportDriversService {
  constructor(
    @InjectRepository(TransportDriver)
    private driversRepo: Repository<TransportDriver>,
  ) {}

  async create(
    companyId: string,
    data: {
      userId: string;
      vehicleId?: string;
      licenseNumber?: string;
    },
  ): Promise<TransportDriver> {
    const driver = this.driversRepo.create({ companyId, ...data });
    return this.driversRepo.save(driver);
  }

  async findAll(companyId: string | null): Promise<TransportDriver[]> {
    const where = companyId ? { companyId } : {};
    return this.driversRepo.find({
      where,
      relations: { vehicle: true, user: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, companyId?: string | null): Promise<TransportDriver> {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const driver = await this.driversRepo.findOne({
      where,
      relations: { vehicle: true, user: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async findByUserId(userId: string): Promise<TransportDriver | null> {
    return this.driversRepo.findOne({
      where: { userId },
      relations: { vehicle: true, user: true },
    });
  }

  async setAvailability(id: string, isAvailable: boolean, companyId?: string | null): Promise<TransportDriver> {
    const driver = await this.findOne(id, companyId);
    driver.isAvailable = isAvailable;
    return this.driversRepo.save(driver);
  }
}
