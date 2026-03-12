import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('dashboard-stats')
  getDashboardStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getDashboardStats(startDate, endDate);
  }

  @Get('sessions-by-day')
  getSessionsByDay(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSessionsByDay(startDate, endDate);
  }

  @Get('heatmap')
  getHeatmap(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getHeatmap(startDate, endDate);
  }

  @Get('doctor-performance')
  getDoctorPerformance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getDoctorPerformance(startDate, endDate);
  }

  @Get('patient-growth')
  getPatientGrowth() {
    return this.reportsService.getPatientGrowth();
  }

  @Get('transport-stats')
  getTransportStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getTransportStats(startDate, endDate);
  }
}
