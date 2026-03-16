import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { requireCompanyId } from '../common/company-id';
import { User, UserRole } from '../users/entities/user.entity';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  private companyId(user: User): string | null {
    return user.role !== UserRole.PATIENT ? requireCompanyId(user) : null;
  }

  @Get('stats')
  @UseGuards(PermissionsGuard)
  @RequirePermission('reports_view')
  getStats(
    @CurrentUser() user: User,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }
    return this.reportsService.getStats(this.companyId(user), startDate, endDate);
  }

  @Get('recovery-trends')
  @UseGuards(PermissionsGuard)
  @RequirePermission('reports_view')
  getRecoveryTrends(@CurrentUser() user: User, @Query('patientIds') patientIds: string) {
    const ids = patientIds ? patientIds.split(',').map((id) => id.trim()).filter(Boolean) : [];
    return this.reportsService.getRecoveryTrends(this.companyId(user), ids);
  }

  @Get('dashboard-stats')
  @UseGuards(PermissionsGuard)
  @RequirePermission('reports_view')
  getDashboardStats(
    @CurrentUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getDashboardStats(this.companyId(user), startDate, endDate);
  }

  @Get('sessions-by-day')
  @UseGuards(PermissionsGuard)
  @RequirePermission('reports_view')
  getSessionsByDay(
    @CurrentUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSessionsByDay(this.companyId(user), startDate, endDate);
  }

  @Get('heatmap')
  @UseGuards(PermissionsGuard)
  @RequirePermission('reports_view')
  getHeatmap(
    @CurrentUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getHeatmap(this.companyId(user), startDate, endDate);
  }

  @Get('doctor-performance')
  @UseGuards(PermissionsGuard)
  @RequirePermission('reports_view')
  getDoctorPerformance(
    @CurrentUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getDoctorPerformance(this.companyId(user), startDate, endDate);
  }

  @Get('patient-growth')
  @UseGuards(PermissionsGuard)
  @RequirePermission('reports_view')
  getPatientGrowth(@CurrentUser() user: User) {
    return this.reportsService.getPatientGrowth(this.companyId(user));
  }

  @Get('transport-stats')
  @UseGuards(PermissionsGuard)
  @RequirePermission('reports_view')
  getTransportStats(
    @CurrentUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getTransportStats(this.companyId(user), startDate, endDate);
  }
}
