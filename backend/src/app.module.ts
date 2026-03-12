import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PatientsModule } from './patients/patients.module';
import { RoomsModule } from './rooms/rooms.module';
import { EquipmentModule } from './equipment/equipment.module';
import { SchedulesModule } from './schedules/schedules.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ClinicalSessionsModule } from './clinical-sessions/clinical-sessions.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ExercisesModule } from './exercises/exercises.module';
import { TransportModule } from './transport/transport.module';
import { ReportsModule } from './reports/reports.module';
import { User } from './users/entities/user.entity';
import { Patient } from './patients/entities/patient.entity';
import { Room } from './rooms/entities/room.entity';
import { Equipment } from './equipment/entities/equipment.entity';
import { Schedule } from './schedules/entities/schedule.entity';
import { Appointment } from './appointments/entities/appointment.entity';
import { ClinicalSession } from './clinical-sessions/entities/clinical-session.entity';
import { Attachment } from './attachments/entities/attachment.entity';
import { Exercise } from './exercises/entities/exercise.entity';
import { PatientExercise } from './exercises/entities/patient-exercise.entity';
import { ExerciseCompletion } from './exercises/entities/exercise-completion.entity';
import { TransportVehicle } from './transport/entities/transport-vehicle.entity';
import { TransportDriver } from './transport/entities/transport-driver.entity';
import { TransportRequest } from './transport/entities/transport-request.entity';
import { Invoice } from './billing/entities/invoice.entity';
import { InvoiceItem } from './billing/entities/invoice-item.entity';
import { Payment } from './billing/entities/payment.entity';
import { BillingModule } from './billing/billing.module';
import { Notification } from './notifications/entities/notification.entity';
import { NotificationsModule } from './notifications/notifications.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const databaseUrl = process.env.DATABASE_URL;
        return {
          type: 'postgres',
          ...(databaseUrl
            ? { url: databaseUrl }
            : {
                host: process.env.DB_HOST ?? 'localhost',
                port: parseInt(process.env.DB_PORT ?? '5432', 10),
                username: process.env.DB_USER ?? 'postgres',
                password: process.env.DB_PASSWORD ?? 'postgres',
                database: process.env.DB_NAME ?? 'pt_center',
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
        synchronize: process.env.NODE_ENV !== 'production' || process.env.DATABASE_SYNC === 'true',
        logging: process.env.NODE_ENV === 'development',
        ssl: databaseUrl ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    AuthModule,
    UsersModule,
    PatientsModule,
    RoomsModule,
    EquipmentModule,
    SchedulesModule,
    AppointmentsModule,
    ClinicalSessionsModule,
    AttachmentsModule,
    ExercisesModule,
    TransportModule,
    ReportsModule,
    BillingModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
