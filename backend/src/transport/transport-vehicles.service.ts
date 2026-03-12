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

  async create(data: {
    plateNumber: string;
    vehicleType?: string;
    accommodationType?: TransportVehicle['accommodationType'];
    capacity?: number;
  }): Promise<TransportVehicle> {
    const vehicle = this.vehiclesRepo.create(data);
    return this.vehiclesRepo.save(vehicle);
  }

  async findAll(): Promise<TransportVehicle[]> {
    return this.vehiclesRepo.find({ order: { plateNumber: 'ASC' } });
  }

  async findOne(id: string): Promise<TransportVehicle> {
    const vehicle = await this.vehiclesRepo.findOne({ where: { id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async update(
    id: string,
    data: Partial<Pick<TransportVehicle, 'status' | 'accommodationType' | 'capacity'>>,
  ): Promise<TransportVehicle> {
    const vehicle = await this.findOne(id);
    Object.assign(vehicle, data);
    return this.vehiclesRepo.save(vehicle);
  }
}
