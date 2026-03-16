import { ForbiddenException } from '@nestjs/common';
import { User, UserRole } from '../users/entities/user.entity';

/**
 * Multi-tenancy: استخراج company_id من المستخدم الحالي.
 * يرمي ForbiddenException إذا كان المستخدم (من الطاقم) بدون شركة.
 * دور المريض (PATIENT) لا يستخدم company_id للوصول لبياناته.
 */
export function requireCompanyId(user: User): string {
  if (user.role !== UserRole.PATIENT && !user.companyId) {
    throw new ForbiddenException(
      'لا يوجد مركز مرتبط بهذا الحساب. يرجى تشغيل سكربت ربط الشركة: npm run db:seed-company',
    );
  }
  return user.companyId!;
}
