import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';
import { ClinicalSession } from '../clinical-sessions/entities/clinical-session.entity';
import { Patient } from '../patients/entities/patient.entity';
import { TransportRequest } from '../transport/entities/transport-request.entity';
import { TransportVehicle } from '../transport/entities/transport-vehicle.entity';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentsRepo: Repository<Appointment>,
    @InjectRepository(ClinicalSession)
    private sessionsRepo: Repository<ClinicalSession>,
    @InjectRepository(Patient)
    private patientsRepo: Repository<Patient>,
    @InjectRepository(TransportRequest)
    private transportRepo: Repository<TransportRequest>,
    @InjectRepository(TransportVehicle)
    private vehiclesRepo: Repository<TransportVehicle>,
    private billingService: BillingService,
  ) {}

  private parseRange(startDate?: string, endDate?: string): { start: Date; end: Date } {
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  async getDashboardStats(startDate?: string, endDate?: string) {
    const { start, end } = this.parseRange(startDate, endDate);

    const completedCount = await this.appointmentsRepo
      .createQueryBuilder('a')
      .where('a.start_time >= :start', { start })
      .andWhere('a.start_time <= :end', { end })
      .andWhere('a.status = :completed', { completed: AppointmentStatus.COMPLETED })
      .getCount();

    const sessionsWithRecovery = await this.sessionsRepo
      .createQueryBuilder('cs')
      .innerJoin('cs.appointment', 'a')
      .where('a.start_time >= :start', { start })
      .andWhere('a.start_time <= :end', { end })
      .andWhere('cs.recovery_score IS NOT NULL')
      .select('AVG(cs.recovery_score)', 'avg')
      .getRawOne<{ avg: string }>();
    const avgRecovery = sessionsWithRecovery?.avg ? Math.round(parseFloat(sessionsWithRecovery.avg)) : 0;

    const totalInRange = await this.appointmentsRepo
      .createQueryBuilder('a')
      .where('a.start_time >= :start', { start })
      .andWhere('a.start_time <= :end', { end })
      .getCount();
    const inProgressCount = await this.appointmentsRepo
      .createQueryBuilder('a')
      .where('a.start_time >= :start', { start })
      .andWhere('a.start_time <= :end', { end })
      .andWhere('a.status = :ip', { ip: AppointmentStatus.IN_PROGRESS })
      .getCount();
    const attendanceRate = totalInRange > 0 ? Math.round(((completedCount + inProgressCount) / totalInRange) * 100) : 0;

    const cancellations = await this.appointmentsRepo
      .createQueryBuilder('a')
      .where('a.start_time >= :start', { start })
      .andWhere('a.start_time <= :end', { end })
      .andWhere('a.status = :cancelled', { cancelled: AppointmentStatus.CANCELLED })
      .getCount();

    const newPatients = await this.patientsRepo
      .createQueryBuilder('p')
      .where('p.created_at >= :start', { start })
      .andWhere('p.created_at <= :end', { end })
      .getCount();

    let revenue = 0;
    try {
      revenue = await this.billingService.getRevenueForDateRange(
        start.toISOString().slice(0, 10),
        end.toISOString().slice(0, 10),
      );
    } catch {
      revenue = 0;
    }

    return {
      totalSessions: completedCount,
      avgRecovery,
      attendanceRate,
      cancellations,
      newPatients,
      revenue,
    };
  }

  async getSessionsByDay(startDate?: string, endDate?: string): Promise<{ date: string; count: number }[]> {
    const { start, end } = this.parseRange(startDate, endDate);
    const qb = this.appointmentsRepo
      .createQueryBuilder('a')
      .select("DATE(a.start_time)", "date")
      .addSelect('COUNT(*)', 'count')
      .where('a.start_time >= :start', { start })
      .andWhere('a.start_time <= :end', { end })
      .andWhere('a.status = :completed', { completed: AppointmentStatus.COMPLETED })
      .groupBy("DATE(a.start_time)")
      .orderBy("DATE(a.start_time)", 'ASC');
    const raw = await qb.getRawMany<{ date: string; count: string }>();
    return raw.map((r) => ({ date: r.date, count: parseInt(r.count, 10) }));
  }

  async getHeatmap(startDate?: string, endDate?: string): Promise<{ dayOfWeek: number; hour: number; count: number }[]> {
    const { start, end } = this.parseRange(startDate, endDate);
    const qb = this.appointmentsRepo
      .createQueryBuilder('a')
      .select('EXTRACT(DOW FROM a.start_time)', 'dayOfWeek')
      .addSelect('EXTRACT(HOUR FROM a.start_time)', 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('a.start_time >= :start', { start })
      .andWhere('a.start_time <= :end', { end })
      .andWhere('a.status = :completed', { completed: AppointmentStatus.COMPLETED })
      .groupBy('EXTRACT(DOW FROM a.start_time)')
      .addGroupBy('EXTRACT(HOUR FROM a.start_time)');
    const raw = await qb.getRawMany<{ dayOfWeek: string; hour: string; count: string }>();
    return raw.map((r) => ({
      dayOfWeek: parseInt(r.dayOfWeek, 10),
      hour: parseInt(r.hour, 10),
      count: parseInt(r.count, 10),
    }));
  }

  async getDoctorPerformance(startDate?: string, endDate?: string): Promise<
    { doctorId: string; doctorName: string; sessionsCount: number; avgRecovery: number; attendanceRate: number }[]
  > {
    const { start, end } = this.parseRange(startDate, endDate);

    const byDoctor = await this.appointmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.doctor', 'd')
      .select('a.doctor_id', 'doctorId')
      .addSelect('d.name_ar', 'doctorName')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END)`,
        'completed',
      )
      .addSelect(
        `SUM(CASE WHEN a.status = 'in_progress' THEN 1 ELSE 0 END)`,
        'inProgress',
      )
      .where('a.start_time >= :start', { start })
      .andWhere('a.start_time <= :end', { end })
      .groupBy('a.doctor_id')
      .addGroupBy('d.name_ar')
      .getRawMany<{ doctorId: string; doctorName: string; total: string; completed: string; inProgress: string }>();

    const doctorIds = byDoctor.map((r) => r.doctorId);
    let recoveryMap: Record<string, number> = {};
    if (doctorIds.length > 0) {
      const recoveryRaw = await this.sessionsRepo
        .createQueryBuilder('cs')
        .innerJoin('cs.appointment', 'a')
        .where('a.doctor_id IN (:...ids)', { ids: doctorIds })
        .andWhere('a.start_time >= :start', { start })
        .andWhere('a.start_time <= :end', { end })
        .andWhere('cs.recovery_score IS NOT NULL')
        .select('a.doctor_id', 'doctorId')
        .addSelect('AVG(cs.recovery_score)', 'avg')
        .groupBy('a.doctor_id')
        .getRawMany<{ doctorId: string; avg: string }>();
      recoveryMap = Object.fromEntries(recoveryRaw.map((r) => [r.doctorId, Math.round(parseFloat(r.avg || '0'))]));
    }

    return byDoctor.map((r) => {
      const total = parseInt(r.total, 10);
      const completed = parseInt(r.completed, 10) || 0;
      const inProgress = parseInt(r.inProgress, 10) || 0;
      const attendanceRate = total > 0 ? Math.round(((completed + inProgress) / total) * 100) : 0;
      return {
        doctorId: r.doctorId,
        doctorName: r.doctorName ?? '',
        sessionsCount: completed,
        avgRecovery: recoveryMap[r.doctorId] ?? 0,
        attendanceRate,
      };
    });
  }

  async getPatientGrowth(): Promise<{ month: string; newPatients: number }[]> {
    const raw = await this.patientsRepo
      .createQueryBuilder('p')
      .select("TO_CHAR(p.created_at, 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'count')
      .groupBy("TO_CHAR(p.created_at, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany<{ month: string; count: string }>();
    return raw.map((r) => ({ month: r.month, newPatients: parseInt(r.count, 10) }));
  }

  async getTransportStats(startDate?: string, endDate?: string) {
    const { start, end } = this.parseRange(startDate, endDate);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const totalTrips = await this.transportRepo
      .createQueryBuilder('tr')
      .where('tr.created_at >= :start', { start })
      .andWhere('tr.created_at <= :end', { end })
      .getCount();

    const todayTrips = await this.transportRepo
      .createQueryBuilder('tr')
      .where('tr.created_at >= :todayStart', { todayStart })
      .andWhere('tr.created_at <= :todayEnd', { todayEnd })
      .getCount();

    const byMobility = await this.transportRepo
      .createQueryBuilder('tr')
      .select('tr.mobility_need', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('tr.created_at >= :start', { start })
      .andWhere('tr.created_at <= :end', { end })
      .groupBy('tr.mobility_need')
      .getRawMany<{ type: string | null; count: string }>();

    const byVehicle = await this.transportRepo
      .createQueryBuilder('tr')
      .leftJoin('tr.vehicle', 'v')
      .select('tr.vehicle_id', 'vehicleId')
      .addSelect('v.plate_number', 'plate')
      .addSelect('COUNT(*)', 'tripCount')
      .where('tr.created_at >= :start', { start })
      .andWhere('tr.created_at <= :end', { end })
      .andWhere('tr.vehicle_id IS NOT NULL')
      .groupBy('tr.vehicle_id')
      .addGroupBy('v.plate_number')
      .getRawMany<{ vehicleId: string; plate: string; tripCount: string }>();

    return {
      totalTrips,
      todayTrips,
      byMobilityNeed: byMobility.map((r) => ({ type: r.type ?? 'unknown', count: parseInt(r.count, 10) })),
      byVehicle: byVehicle.map((r) => ({
        vehicleId: r.vehicleId,
        plate: r.plate ?? '',
        tripCount: parseInt(r.tripCount, 10),
      })),
    };
  }
}
