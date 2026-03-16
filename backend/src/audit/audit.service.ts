import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  async log(params: {
    userId: string;
    companyId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    details?: Record<string, unknown> | null;
    ip?: string | null;
  }): Promise<AuditLog> {
    const entry = this.auditRepo.create({
      userId: params.userId,
      companyId: params.companyId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      details: params.details ?? null,
      ip: params.ip ?? null,
    });
    return this.auditRepo.save(entry).catch(() => entry);
  }

  async findByCompany(
    companyId: string,
    options?: { limit?: number; offset?: number; entityType?: string; action?: string },
  ): Promise<AuditLog[]> {
    const qb = this.auditRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'u')
      .where('a.company_id = :companyId', { companyId })
      .orderBy('a.created_at', 'DESC')
      .take(options?.limit ?? 50)
      .skip(options?.offset ?? 0);
    if (options?.entityType) qb.andWhere('a.entity_type = :entityType', { entityType: options.entityType });
    if (options?.action) qb.andWhere('a.action = :action', { action: options.action });
    return qb.getMany();
  }
}
