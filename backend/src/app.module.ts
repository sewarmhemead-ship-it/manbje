import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
import { BillingModule } from './billing/billing.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL, // تأكد أنه يقرأ من هنا
      autoLoadEntities: true,
      synchronize: true, // فقط للتطوير
      ssl: true,
      extra: {
        ssl: {
          rejectUnauthorized: false,
        },
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
    PrescriptionsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
