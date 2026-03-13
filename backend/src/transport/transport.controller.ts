import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { TransportVehiclesService } from './transport-vehicles.service';
import { TransportDriversService } from './transport-drivers.service';
import { TransportRequestsService } from './transport-requests.service';
import { CreateTransportRequestDto } from './dto/create-transport-request.dto';
import { UpdateTransportStatusDto } from './dto/update-transport-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
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
  @UseGuards(PermissionsGuard)
  @RequirePermission('transport_manage')
  getVehicles() {
    return this.vehiclesService.findAll();
  }

  @Post('vehicles')
  @UseGuards(PermissionsGuard)
  @RequirePermission('transport_manage')
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
  @UseGuards(PermissionsGuard)
  @RequirePermission('transport_view')
  getDrivers() {
    return this.driversService.findAll();
  }

  @Post('drivers')
  @UseGuards(PermissionsGuard)
  @RequirePermission('transport_manage')
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
  @UseGuards(PermissionsGuard)
  @RequirePermission('transport_view')
  async listRequests(@CurrentUser() user: User) {
    if (user.role === UserRole.DRIVER) {
      const driver = await this.driversService.findByUserId(user.id);
      if (!driver) return [];
      return this.requestsService.findAll(driver.id);
    }
    return this.requestsService.findAll();
  }

  @Post('requests')
  @UseGuards(PermissionsGuard)
  @RequirePermission('transport_manage')
  createRequest(@Body() dto: CreateTransportRequestDto) {
    return this.requestsService.create(dto);
  }

  @Get('requests/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('transport_view')
  async getRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const request = await this.requestsService.findOne(id);
    if (user.role === UserRole.DRIVER) {
      const driver = await this.driversService.findByUserId(user.id);
      if (!driver || request.driverId !== driver.id) {
        throw new ForbiddenException('You can only view your assigned trips');
      }
    }
    return request;
  }

  @Patch('requests/:id/status')
  @UseGuards(PermissionsGuard)
  @RequirePermission('transport_driver')
  updateRequestStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransportStatusDto,
  ) {
    return this.requestsService.updateStatus(id, dto.status);
  }

  @Patch('requests/:id/assign')
  @UseGuards(PermissionsGuard)
  @RequirePermission('transport_manage')
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
