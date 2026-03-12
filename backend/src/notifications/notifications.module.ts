import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { OutboundNotificationsService } from './outbound-notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { OutboundNotification } from './entities/outbound-notification.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { TransportRequest } from '../transport/entities/transport-request.entity';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [
    PatientsModule,
    TypeOrmModule.forFeature([
      Notification,
      OutboundNotification,
      Patient,
      Appointment,
      TransportRequest,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, OutboundNotificationsService],
  exports: [NotificationsService, OutboundNotificationsService],
})
export class NotificationsModule {}
