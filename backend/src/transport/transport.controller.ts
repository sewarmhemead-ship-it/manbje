import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TransportVehiclesService } from './transport-vehicles.service';
import { TransportDriversService } from './transport-drivers.service';
import { TransportRequestsService } from './transport-requests.service';
import { CreateTransportRequestDto } from './dto/create-transport-request.dto';
import { UpdateTransportStatusDto } from './dto/update-transport-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { VehicleAccommodationType } from './entities/transport-vehicle.entity';

@Controller('transport')
@UseGuards(JwtAuthGuard)
export class TransportController {
  constructor(
    private vehiclesService: TransportVehiclesService,
    private driversService: TransportDriversService,
    private requestsService: TransportRequestsService,
  ) {}

  @Get('vehicles')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getVehicles() {
    return this.vehiclesService.findAll();
  }

  @Post('vehicles')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  createVehicle(
    @Body()
    body: {
      plateNumber: string;
      vehicleType?: string;
      accommodationType?: VehicleAccommodationType;
      capacity?: number;
    },
  ) {
    return this.vehiclesService.create(body);
  }

  @Patch('vehicles/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateVehicle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: {
      status?: string;
      accommodationType?: VehicleAccommodationType;
      capacity?: number;
    },
  ) {
    return this.vehiclesService.update(id, body);
  }

  @Get('drivers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  getDrivers() {
    return this.driversService.findAll();
  }

  @Post('drivers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  createDriver(
    @Body() body: { userId: string; vehicleId?: string; licenseNumber?: string },
  ) {
    return this.driversService.create(body);
  }

  @Patch('drivers/:id/availability')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  setDriverAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { isAvailable: boolean },
  ) {
    return this.driversService.setAvailability(id, body.isAvailable);
  }

  @Get('requests')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  listRequests() {
    return this.requestsService.findAll();
  }

  @Post('requests')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  createRequest(@Body() dto: CreateTransportRequestDto) {
    return this.requestsService.create(dto);
  }

  @Get('requests/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.DRIVER)
  getRequest(@Param('id', ParseUUIDPipe) id: string) {
    return this.requestsService.findOne(id);
  }

  @Patch('requests/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  updateRequestStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransportStatusDto,
  ) {
    return this.requestsService.updateStatus(id, dto.status);
  }

  @Patch('requests/:id/assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  assignDriver(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { driverId: string; vehicleId: string },
  ) {
    return this.requestsService.assignDriverAndVehicle(
      id,
      body.driverId,
      body.vehicleId,
    );
  }
}
