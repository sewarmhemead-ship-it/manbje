import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('stats')
  @UseGuards(PermissionsGuard)
  @RequirePermission('reports_view')
  getStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    return this.reportsService.getStats(startDate, endDate);
  }

  @Get('recovery-trends')
  @UseGuards(PermissionsGuard)
  @RequirePermission('reports_view')
  getRecoveryTrends(@Query('patientIds') patientIds: string) {
    const ids = patientIds ? patientIds.split(',').map((id) => id.trim()).filter(Boolean) : [];
    return this.reportsService.getRecoveryTrends(ids);
  }

  @Get('dashboard-stats')
  @UseGuards(PermissionsGuard)
  @RequirePermission('reports_view')
  getDashboardStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getDashboardStats(startDate, endDate);
  }

  @Get('sessions-by-day')
  @UseGuards(PermissionsGuard)
  @RequirePermission('reports_view')
  getSessionsByDay(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSessionsByDay(startDate, endDate);
  }

  @Get('heatmap')
  @UseGuards(PermissionsGuard)
  @RequirePermission('reports_view')
  getHeatmap(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getHeatmap(startDate, endDate);
  }

  @Get('doctor-performance')
  @UseGuards(PermissionsGuard)
  @RequirePermission('reports_view')
  getDoctorPerformance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getDoctorPerformance(startDate, endDate);
  }

  @Get('patient-growth')
  @UseGuards(PermissionsGuard)
  @RequirePermission('reports_view')
  getPatientGrowth() {
    return this.reportsService.getPatientGrowth();
  }

  @Get('transport-stats')
  @UseGuards(PermissionsGuard)
  @RequirePermission('reports_view')
  getTransportStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getTransportStats(startDate, endDate);
  }
}
