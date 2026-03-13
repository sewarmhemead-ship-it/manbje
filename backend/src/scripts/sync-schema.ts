/**
 * One-off script to synchronize TypeORM schema with the database (e.g. Supabase).
 * Creates all tables (users, patients, appointments, etc.) if they don't exist.
 *
 * Run: npm run db:sync
 * Requires: DATABASE_URL in .env or environment
 */
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';
import { User } from '../users/entities/user.entity';
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
import { OutboundNotification } from '../notifications/entities/outbound-notification.entity';
import { Drug } from '../prescriptions/entities/drug.entity';
import { Prescription } from '../prescriptions/entities/prescription.entity';
import { PrescriptionItem } from '../prescriptions/entities/prescription-item.entity';

config({ path: resolve(__dirname, '../../.env') });

const databaseUrl = process.env.DATABASE_URL;

const dataSource = new DataSource({
  type: 'postgres',
  ...(databaseUrl
    ? {
        url: databaseUrl,
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
    OutboundNotification,
    Drug,
    Prescription,
    PrescriptionItem,
  ],
  synchronize: true,
  logging: true,
});

dataSource
  .initialize()
  .then(() => {
    console.log('Schema synchronized successfully. Tables created/updated.');
    return dataSource.destroy();
  })
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Schema sync failed:', err);
    process.exit(1);
  });
