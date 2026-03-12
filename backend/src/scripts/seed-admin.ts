/**
 * إنشاء مستخدم أدمن افتراضي لتسجيل الدخول (للتطوير والاختبار).
 *
 * بيانات تسجيل الدخول الافتراضية:
 *   البريد: admin@example.com
 *   كلمة المرور: Admin123!
 *
 * التشغيل: npm run db:seed
 * المتطلبات: DATABASE_URL في .env، وتشغيل db:sync أولاً إن لزم.
 */
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Room } from '../rooms/entities/room.entity';
import { Equipment } from '../equipment/entities/equipment.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { ClinicalSession } from '../clinical-sessions/entities/clinical-session.entity';
import { Attachment } from '../attachments/entities/attachment.entity';
import { Exercise } from '../exercises/entities/exercise.entity';
import { PatientExercise } from '../exercises/entities/patient-exercise.entity';
import { ExerciseCompletion } from '../exercises/entities/exercise-completion.entity';
import { TransportVehicle } from '../transport/entities/transport-vehicle.entity';
import { TransportDriver } from '../transport/entities/transport-driver.entity';
import { TransportRequest } from '../transport/entities/transport-request.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { InvoiceItem } from '../billing/entities/invoice-item.entity';
import { Payment } from '../billing/entities/payment.entity';
import { Notification } from '../notifications/entities/notification.entity';

config({ path: resolve(__dirname, '../../.env') });

const DEFAULT_ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin123!';

const dataSource = new DataSource({
  type: 'postgres',
  ...(process.env.DATABASE_URL
    ? {
        url: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        username: process.env.DB_USER ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
        database: process.env.DB_NAME ?? 'pt_center',
        ssl: false,
      }),
  entities: [
    User,
    Patient,
    Room,
    Equipment,
    Schedule,
    Appointment,
    ClinicalSession,
    Attachment,
    Exercise,
    PatientExercise,
    ExerciseCompletion,
    TransportVehicle,
    TransportDriver,
    TransportRequest,
    Invoice,
    InvoiceItem,
    Payment,
    Notification,
  ],
  synchronize: false,
  logging: true,
});

dataSource
  .initialize()
  .then(async () => {
    const repo = dataSource.getRepository(User);
    const existing = await repo.findOne({ where: { email: DEFAULT_ADMIN_EMAIL } });
    if (existing) {
      console.log('Admin user already exists:', DEFAULT_ADMIN_EMAIL);
      return dataSource.destroy();
    }
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    await repo.save(
      repo.create({
        email: DEFAULT_ADMIN_EMAIL,
        passwordHash,
        role: UserRole.ADMIN,
        nameAr: 'مدير النظام',
        nameEn: 'Admin',
        isActive: true,
      }),
    );
    console.log('Default admin created.');
    console.log('  Email:', DEFAULT_ADMIN_EMAIL);
    console.log('  Password:', DEFAULT_ADMIN_PASSWORD);
    return dataSource.destroy();
  })
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
