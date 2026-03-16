/**
 * إنشاء شركة افتراضية وربط كل البيانات بها (للمراكز الحالية أو بعد إضافة multi-tenancy).
 * تشغيل: npx ts-node -r tsconfig-paths/register src/scripts/seed-company.ts
 * أو: npm run db:seed-company
 */
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';
import { Company } from '../companies/entities/company.entity';
import { User } from '../users/entities/user.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Room } from '../rooms/entities/room.entity';
import { Equipment } from '../equipment/entities/equipment.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Drug } from '../prescriptions/entities/drug.entity';
import { Prescription } from '../prescriptions/entities/prescription.entity';
import { TransportRequest } from '../transport/entities/transport-request.entity';
import { TransportDriver } from '../transport/entities/transport-driver.entity';
import { TransportVehicle } from '../transport/entities/transport-vehicle.entity';
import { Exercise } from '../exercises/entities/exercise.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { Notification } from '../notifications/entities/notification.entity';

config({ path: resolve(__dirname, '../../.env') });

const dataSource = new DataSource({
  type: 'postgres',
  ...(process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        username: process.env.DB_USER ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
        database: process.env.DB_NAME ?? 'physiocore',
        ssl: false,
      }),
  entities: [
    Company,
    User,
    Patient,
    Room,
    Equipment,
    Appointment,
    Schedule,
    Drug,
    Prescription,
    TransportRequest,
    TransportDriver,
    TransportVehicle,
    Exercise,
    Invoice,
    Notification,
  ],
  synchronize: false,
  logging: true,
});

async function run() {
  await dataSource.initialize();
  const companyRepo = dataSource.getRepository(Company);
  let company = await companyRepo.findOne({ where: {}, order: { createdAt: 'ASC' } });
  if (!company) {
    company = await companyRepo.save(
      companyRepo.create({
        nameAr: 'مركز العلاج الفيزيائي',
        nameEn: 'PhysioCore Center',
        slug: 'physiocore',
        isActive: true,
      }),
    );
    console.log('✓ تم إنشاء الشركة الافتراضية:', company.id);
  } else {
    console.log('✓ استخدام الشركة الموجودة:', company.id);
  }
  const cid = company.id;

  const tables: { name: string; repo: any; column: string }[] = [
    { name: 'users', repo: dataSource.getRepository(User), column: 'company_id' },
    { name: 'patients', repo: dataSource.getRepository(Patient), column: 'company_id' },
    { name: 'rooms', repo: dataSource.getRepository(Room), column: 'company_id' },
    { name: 'equipment', repo: dataSource.getRepository(Equipment), column: 'company_id' },
    { name: 'appointments', repo: dataSource.getRepository(Appointment), column: 'company_id' },
    { name: 'schedules', repo: dataSource.getRepository(Schedule), column: 'company_id' },
    { name: 'drugs', repo: dataSource.getRepository(Drug), column: 'company_id' },
    { name: 'prescriptions', repo: dataSource.getRepository(Prescription), column: 'company_id' },
    { name: 'transport_requests', repo: dataSource.getRepository(TransportRequest), column: 'company_id' },
    { name: 'transport_drivers', repo: dataSource.getRepository(TransportDriver), column: 'company_id' },
    { name: 'transport_vehicles', repo: dataSource.getRepository(TransportVehicle), column: 'company_id' },
    { name: 'exercises', repo: dataSource.getRepository(Exercise), column: 'company_id' },
    { name: 'invoices', repo: dataSource.getRepository(Invoice), column: 'company_id' },
    { name: 'notifications', repo: dataSource.getRepository(Notification), column: 'company_id' },
  ];

  for (const { name, repo } of tables) {
    const meta = repo.metadata;
    const tableName = meta.tableName;
    const result = await dataSource.query(
      `UPDATE ${tableName} SET company_id = $1 WHERE company_id IS NULL`,
      [cid],
    );
    const rowCount = (result as { rowCount?: number })?.rowCount ?? 0;
    if (rowCount > 0) console.log(`  ${tableName}: تحديث ${rowCount} صف`);
  }

  console.log('✓ انتهى ربط البيانات بالشركة الافتراضية');
  await dataSource.destroy();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
