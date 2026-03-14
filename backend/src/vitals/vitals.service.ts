import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vital } from './entities/vital.entity';
import { CreateVitalDto } from './dto/create-vital.dto';
import { PatientsService } from '../patients/patients.service';

@Injectable()
export class VitalsService {
  constructor(
    @InjectRepository(Vital)
    private vitalsRepo: Repository<Vital>,
    private patientsService: PatientsService,
  ) {}

  async create(dto: CreateVitalDto, recordedById: string): Promise<Vital> {
    await this.patientsService.findOne(dto.patientId);
    const vital = this.vitalsRepo.create({
      patientId: dto.patientId,
      recordedById,
      heartRate: dto.heartRate ?? null,
      bloodPressure: dto.bloodPressure ?? null,
      oxygenSaturation: dto.oxygenSaturation ?? null,
      temperature: dto.temperature ?? null,
      painLevel: dto.painLevel ?? null,
      notes: dto.notes ?? null,
    });
    return this.vitalsRepo.save(vital);
  }

  async findByPatient(patientId: string, limit = 10): Promise<Vital[]> {
    await this.patientsService.findOne(patientId);
    return this.vitalsRepo.find({
      where: { patientId },
      relations: { recordedBy: true },
      order: { recordedAt: 'DESC' },
      take: limit,
    });
  }

  async findLatest(patientId: string): Promise<Vital | null> {
    await this.patientsService.findOne(patientId);
    return this.vitalsRepo.findOne({
      where: { patientId },
      relations: { recordedBy: true },
      order: { recordedAt: 'DESC' },
    });
  }
}
