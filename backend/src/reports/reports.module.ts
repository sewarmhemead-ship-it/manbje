import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Appointment } from '../appointments/entities/appointment.entity';
import { ClinicalSession } from '../clinical-sessions/entities/clinical-session.entity';
import { Patient } from '../patients/entities/patient.entity';
import { TransportRequest } from '../transport/entities/transport-request.entity';
import { TransportVehicle } from '../transport/entities/transport-vehicle.entity';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      ClinicalSession,
      Patient,
      TransportRequest,
      TransportVehicle,
    ]),
    BillingModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
