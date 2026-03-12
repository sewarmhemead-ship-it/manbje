import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransportVehicle } from './entities/transport-vehicle.entity';
import { TransportDriver } from './entities/transport-driver.entity';
import { TransportRequest } from './entities/transport-request.entity';
import { TransportVehiclesService } from './transport-vehicles.service';
import { TransportDriversService } from './transport-drivers.service';
import { TransportRequestsService } from './transport-requests.service';
import { TransportController } from './transport.controller';
import { AppointmentsModule } from '../appointments/appointments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransportVehicle, TransportDriver, TransportRequest, User]),
    forwardRef(() => AppointmentsModule),
    NotificationsModule,
  ],
  providers: [TransportVehiclesService, TransportDriversService, TransportRequestsService],
  controllers: [TransportController],
  exports: [TransportRequestsService],
})
export class TransportModule {}
