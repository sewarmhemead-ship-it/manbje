import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { SchedulesModule } from '../schedules/schedules.module';
import { RoomsModule } from '../rooms/rooms.module';
import { EquipmentModule } from '../equipment/equipment.module';
import { PatientsModule } from '../patients/patients.module';
import { TransportModule } from '../transport/transport.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment]),
    SchedulesModule,
    RoomsModule,
    EquipmentModule,
    PatientsModule,
    forwardRef(() => TransportModule),
    BillingModule,
    NotificationsModule,
  ],
  providers: [AppointmentsService],
  controllers: [AppointmentsController],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
