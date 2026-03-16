import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransportVehicle } from './entities/transport-vehicle.entity';

@Injectable()
export class TransportVehiclesService {
  constructor(
    @InjectRepository(TransportVehicle)
    private vehiclesRepo: Repository<TransportVehicle>,
  ) {}

  async create(
    companyId: string,
    data: {
      plateNumber: string;
      vehicleType?: string;
      accommodationType?: TransportVehicle['accommodationType'];
      capacity?: number;
    },
  ): Promise<TransportVehicle> {
    const vehicle = this.vehiclesRepo.create({ companyId, ...data });
    return this.vehiclesRepo.save(vehicle);
  }

  async findAll(companyId: string | null): Promise<TransportVehicle[]> {
    const where = companyId ? { companyId } : {};
    return this.vehiclesRepo.find({ where, order: { plateNumber: 'ASC' } });
  }

  async findOne(id: string, companyId?: string | null): Promise<TransportVehicle> {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const vehicle = await this.vehiclesRepo.findOne({ where });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async update(
    id: string,
    data: Partial<Pick<TransportVehicle, 'status' | 'accommodationType' | 'capacity'>>,
    companyId?: string | null,
  ): Promise<TransportVehicle> {
    const vehicle = await this.findOne(id, companyId);
    Object.assign(vehicle, data);
    return this.vehiclesRepo.save(vehicle);
  }
}
