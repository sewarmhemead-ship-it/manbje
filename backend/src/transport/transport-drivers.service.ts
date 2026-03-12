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

  async create(data: {
    userId: string;
    vehicleId?: string;
    licenseNumber?: string;
  }): Promise<TransportDriver> {
    const driver = this.driversRepo.create(data);
    return this.driversRepo.save(driver);
  }

  async findAll(): Promise<TransportDriver[]> {
    return this.driversRepo.find({
      relations: { vehicle: true, user: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<TransportDriver> {
    const driver = await this.driversRepo.findOne({
      where: { id },
      relations: { vehicle: true, user: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async setAvailability(id: string, isAvailable: boolean): Promise<TransportDriver> {
    const driver = await this.findOne(id);
    driver.isAvailable = isAvailable;
    return this.driversRepo.save(driver);
  }
}
