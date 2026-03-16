import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly repo: Repository<Company>,
  ) {}

  async findById(id: string): Promise<Company | null> {
    return this.repo.findOne({ where: { id, isActive: true } });
  }

  async getDefaultOrFirst(): Promise<Company | null> {
    return this.repo.findOne({ where: { isActive: true }, order: { createdAt: 'ASC' } });
  }
}
