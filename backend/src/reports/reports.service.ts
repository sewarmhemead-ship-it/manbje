import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
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

  async getDashboardStats(companyId: string | null, startDate?: string, endDate?: string) {
    const { start, end } = this.parseRange(startDate, endDate);

    const baseAppt = () => {
      const q = this.appointmentsRepo.createQueryBuilder('a');
      q.where('a.start_time >= :start', { start }).andWhere('a.start_time <= :end', { end });
      if (companyId) q.andWhere('a.company_id = :companyId', { companyId });
      return q;
    };

    const completedCount = await baseAppt()
      .andWhere('a.status = :completed', { completed: AppointmentStatus.COMPLETED })
      .getCount();

    const sessionsQb = this.sessionsRepo
      .createQueryBuilder('cs')
      .innerJoin('cs.appointment', 'a')
      .where('a.start_time >= :start', { start })
      .andWhere('a.start_time <= :end', { end })
      .andWhere('cs.recovery_score IS NOT NULL');
    if (companyId) sessionsQb.andWhere('a.company_id = :companyId', { companyId });
    const sessionsWithRecovery = await sessionsQb.select('AVG(cs.recovery_score)', 'avg').getRawOne<{ avg: string }>();
    const avgRecovery = sessionsWithRecovery?.avg ? Math.round(parseFloat(sessionsWithRecovery.avg)) : 0;

    const totalInRange = await baseAppt().getCount();
    const inProgressCount = await baseAppt().andWhere('a.status = :ip', { ip: AppointmentStatus.IN_PROGRESS }).getCount();
    const attendanceRate = totalInRange > 0 ? Math.round(((completedCount + inProgressCount) / totalInRange) * 100) : 0;

    const cancellations = await baseAppt().andWhere('a.status = :cancelled', { cancelled: AppointmentStatus.CANCELLED }).getCount();

    const patientsQb = this.patientsRepo
      .createQueryBuilder('p')
      .where('p.created_at >= :start', { start })
      .andWhere('p.created_at <= :end', { end });
    if (companyId) patientsQb.andWhere('p.company_id = :companyId', { companyId });
    const newPatients = await patientsQb.getCount();

    let revenue = 0;
    try {
      revenue = await this.billingService.getRevenueForDateRange(
        start.toISOString().slice(0, 10),
        end.toISOString().slice(0, 10),
        companyId ?? undefined,
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

  async getSessionsByDay(companyId: string | null, startDate?: string, endDate?: string): Promise<{ date: string; count: number }[]> {
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
    if (companyId) qb.andWhere('a.company_id = :companyId', { companyId });
    const raw = await qb.getRawMany<{ date: string; count: string }>();
    return raw.map((r) => ({ date: r.date, count: parseInt(r.count, 10) }));
  }

  async getHeatmap(companyId: string | null, startDate?: string, endDate?: string): Promise<{ dayOfWeek: number; hour: number; count: number }[]> {
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
    if (companyId) qb.andWhere('a.company_id = :companyId', { companyId });
    const raw = await qb.getRawMany<{ dayOfWeek: string; hour: string; count: string }>();
    return raw.map((r) => ({
      dayOfWeek: parseInt(r.dayOfWeek, 10),
      hour: parseInt(r.hour, 10),
      count: parseInt(r.count, 10),
    }));
  }

  async getDoctorPerformance(companyId: string | null, startDate?: string, endDate?: string): Promise<
    { doctorId: string; doctorName: string; sessionsCount: number; avgRecovery: number; attendanceRate: number }[]
  > {
    const { start, end } = this.parseRange(startDate, endDate);

    const byDoctorQb = this.appointmentsRepo
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
      .andWhere('a.start_time <= :end', { end });
    if (companyId) byDoctorQb.andWhere('a.company_id = :companyId', { companyId });
    const byDoctor = await byDoctorQb.groupBy('a.doctor_id').addGroupBy('d.name_ar').getRawMany<{ doctorId: string; doctorName: string; total: string; completed: string; inProgress: string }>();

    const doctorIds = byDoctor.map((r) => r.doctorId);
    let recoveryMap: Record<string, number> = {};
    if (doctorIds.length > 0) {
      const recQb = this.sessionsRepo
        .createQueryBuilder('cs')
        .innerJoin('cs.appointment', 'a')
        .where('a.doctor_id IN (:...ids)', { ids: doctorIds })
        .andWhere('a.start_time >= :start', { start })
        .andWhere('a.start_time <= :end', { end })
        .andWhere('cs.recovery_score IS NOT NULL');
      if (companyId) recQb.andWhere('a.company_id = :companyId', { companyId });
      const recoveryRaw = await recQb.select('a.doctor_id', 'doctorId').addSelect('AVG(cs.recovery_score)', 'avg').groupBy('a.doctor_id').getRawMany<{ doctorId: string; avg: string }>();
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

  async getPatientGrowth(companyId: string | null): Promise<{ month: string; newPatients: number }[]> {
    const qb = this.patientsRepo
      .createQueryBuilder('p')
      .select("TO_CHAR(p.created_at, 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'count')
      .groupBy("TO_CHAR(p.created_at, 'YYYY-MM')")
      .orderBy('month', 'ASC');
    if (companyId) qb.where('p.company_id = :companyId', { companyId });
    const raw = await qb.getRawMany<{ month: string; count: string }>();
    return raw.map((r) => ({ month: r.month, newPatients: parseInt(r.count, 10) }));
  }

  async getStats(companyId: string | null, startDate: string, endDate: string) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const where: any = { startTime: Between(start, end) };
    if (companyId) where.companyId = companyId;
    const appointments = await this.appointmentsRepo.find({
      where,
      relations: { patient: { user: true }, doctor: true },
      order: { startTime: 'ASC' },
    });

    const totalAppointments = appointments.length;
    const completed = appointments.filter((a) => a.status === AppointmentStatus.COMPLETED);
    const cancelled = appointments.filter((a) => a.status === AppointmentStatus.CANCELLED);
    const attendanceRate =
      totalAppointments > 0 ? Math.round((completed.length / totalAppointments) * 100) : 0;

    const patientIds = [...new Set(appointments.map((a) => a.patientId))];
    const activePatients = patientIds.length;

    const transportWhere: any = { createdAt: Between(start, end) };
    if (companyId) transportWhere.companyId = companyId;
    const transport = await this.transportRepo.find({
      where: transportWhere,
    });
    const transportCompleted = transport.filter(
      (t) => t.status === 'completed' || t.status === 'arrived_at_center',
    ).length;
    const transportCancelled = transport.filter((t) => t.status === 'cancelled').length;

    const sessionsAvgQb = this.sessionsRepo
      .createQueryBuilder('cs')
      .innerJoin('cs.appointment', 'a')
      .where('a.start_time >= :start', { start })
      .andWhere('a.start_time <= :end', { end })
      .andWhere('cs.recovery_score IS NOT NULL');
    if (companyId) sessionsAvgQb.andWhere('a.company_id = :companyId', { companyId });
    const sessionsWithRecovery = await sessionsAvgQb.select('AVG(cs.recovery_score)', 'avg').getRawOne<{ avg: string }>();
    const avgRecovery = sessionsWithRecovery?.avg
      ? Math.round(parseFloat(sessionsWithRecovery.avg))
      : null;

    const last7Days: {
      date: string;
      dayName: string;
      completed: number;
      in_progress: number;
      cancelled: number;
      scheduled: number;
    }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const dayStr = day.toISOString().split('T')[0];
      const dayAppts = appointments.filter(
        (a) => new Date(a.startTime).toISOString().split('T')[0] === dayStr,
      );
      last7Days.push({
        date: dayStr,
        dayName: day.toLocaleDateString('ar-SA', { weekday: 'short' }),
        completed: dayAppts.filter((a) => a.status === AppointmentStatus.COMPLETED).length,
        in_progress: dayAppts.filter((a) => a.status === AppointmentStatus.IN_PROGRESS).length,
        cancelled: dayAppts.filter((a) => a.status === AppointmentStatus.CANCELLED).length,
        scheduled: dayAppts.filter((a) => a.status === AppointmentStatus.SCHEDULED).length,
      });
    }

    const statusDist = {
      scheduled: appointments.filter((a) => a.status === AppointmentStatus.SCHEDULED).length,
      completed: completed.length,
      cancelled: cancelled.length,
      in_progress: appointments.filter((a) => a.status === AppointmentStatus.IN_PROGRESS).length,
    };

    const doctorMap = new Map<
      string,
      { doctorId: string; doctorName: string; total: number; completed: number }
    >();
    for (const appt of appointments) {
      const key = appt.doctorId;
      if (!doctorMap.has(key)) {
        doctorMap.set(key, {
          doctorId: key,
          doctorName: (appt.doctor as { nameAr?: string })?.nameAr ?? 'غير معروف',
          total: 0,
          completed: 0,
        });
      }
      const entry = doctorMap.get(key)!;
      entry.total++;
      if (appt.status === AppointmentStatus.COMPLETED) entry.completed++;
    }
    const topDoctors = [...doctorMap.values()]
      .map((d) => ({
        ...d,
        attendanceRate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const patientApptCount = new Map<string, number>();
    for (const appt of appointments) {
      const count = patientApptCount.get(appt.patientId) || 0;
      patientApptCount.set(appt.patientId, count + 1);
    }
    const topPatientIds = [...patientApptCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    const topPatientsWhere = topPatientIds.length > 0 ? topPatientIds.map((id) => ({ id })) : [];
    const topPatients =
      topPatientsWhere.length > 0
        ? await this.patientsRepo.find({
            where: topPatientsWhere,
            relations: { user: true },
          })
        : [];

    const lastVisitByPatient = new Map<string, Date>();
    for (const a of appointments) {
      const t = new Date(a.startTime);
      const prev = lastVisitByPatient.get(a.patientId);
      if (!prev || t > prev) lastVisitByPatient.set(a.patientId, t);
    }

    const recoveryByPatient = new Map<string, number>();
    if (topPatientIds.length > 0) {
      const sessions = await this.sessionsRepo
        .createQueryBuilder('cs')
        .innerJoinAndSelect('cs.appointment', 'a')
        .where('a.patient_id IN (:...ids)', { ids: topPatientIds })
        .andWhere('cs.recovery_score IS NOT NULL')
        .orderBy('a.start_time', 'DESC')
        .getMany();
      for (const s of sessions) {
        const pid = (s.appointment as Appointment).patientId;
        if (!recoveryByPatient.has(pid)) recoveryByPatient.set(pid, s.recoveryScore as number);
      }
    }

    const mostActivePatients = topPatients.map((p) => ({
      id: p.id,
      nameAr: (p.user as { nameAr?: string })?.nameAr ?? 'غير معروف',
      sessionCount: patientApptCount.get(p.id) || 0,
      recoveryScore: recoveryByPatient.get(p.id) ?? null,
      lastVisit: lastVisitByPatient.get(p.id)?.toISOString().slice(0, 10) ?? null,
    }));

    const transportByDay = last7Days.map((d) => ({
      ...d,
      transportCount: transport.filter(
        (t) => new Date(t.createdAt).toISOString().split('T')[0] === d.date,
      ).length,
    }));

    return {
      totalAppointments,
      attendanceRate,
      activePatients,
      completedSessions: completed.length,
      transportTotal: transport.length,
      transportCompleted,
      transportCancelled,
      avgRecovery,
      last7Days,
      statusDist,
      topDoctors,
      mostActivePatients,
      transportByDay,
    };
  }

  async getRecoveryTrends(companyId: string | null, patientIds: string[]) {
    const ids = patientIds.slice(0, 3).filter(Boolean);
    const results: { patientId: string; patientName: string; data: { date: string; score: number }[] }[] = [];

    for (const patientId of ids) {
      const where: any = { id: patientId };
      if (companyId) where.companyId = companyId;
      const patient = await this.patientsRepo.findOne({
        where,
        relations: { user: true },
      });
      const sessions = await this.sessionsRepo
        .createQueryBuilder('cs')
        .innerJoinAndSelect('cs.appointment', 'a')
        .where('a.patient_id = :patientId', { patientId })
        .andWhere('cs.recovery_score IS NOT NULL')
        .orderBy('a.start_time', 'ASC')
        .take(20)
        .getMany();

      const data = sessions.map((s) => ({
        date: new Date((s.appointment as Appointment).startTime).toISOString().split('T')[0],
        score: s.recoveryScore as number,
      }));

      results.push({
        patientId,
        patientName: (patient?.user as { nameAr?: string })?.nameAr ?? 'غير معروف',
        data,
      });
    }
    return results;
  }

  async getTransportStats(companyId: string | null, startDate?: string, endDate?: string) {
    const { start, end } = this.parseRange(startDate, endDate);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const trBase = (qb: any) => {
      if (companyId) qb.andWhere('tr.company_id = :companyId', { companyId });
      return qb;
    };

    const totalTrips = await trBase(
      this.transportRepo.createQueryBuilder('tr').where('tr.created_at >= :start', { start }).andWhere('tr.created_at <= :end', { end }),
    ).getCount();

    const todayTrips = await trBase(
      this.transportRepo.createQueryBuilder('tr').where('tr.created_at >= :todayStart', { todayStart }).andWhere('tr.created_at <= :todayEnd', { todayEnd }),
    ).getCount();

    const byMobilityQb = this.transportRepo
      .createQueryBuilder('tr')
      .select('tr.mobility_need', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('tr.created_at >= :start', { start })
      .andWhere('tr.created_at <= :end', { end })
      .groupBy('tr.mobility_need');
    if (companyId) byMobilityQb.andWhere('tr.company_id = :companyId', { companyId });
    const byMobility = await byMobilityQb.getRawMany<{ type: string | null; count: string }>();

    const byVehicleQb = this.transportRepo
      .createQueryBuilder('tr')
      .leftJoin('tr.vehicle', 'v')
      .select('tr.vehicle_id', 'vehicleId')
      .addSelect('v.plate_number', 'plate')
      .addSelect('COUNT(*)', 'tripCount')
      .where('tr.created_at >= :start', { start })
      .andWhere('tr.created_at <= :end', { end })
      .andWhere('tr.vehicle_id IS NOT NULL')
      .groupBy('tr.vehicle_id')
      .addGroupBy('v.plate_number');
    if (companyId) byVehicleQb.andWhere('tr.company_id = :companyId', { companyId });
    const byVehicle = await byVehicleQb.getRawMany<{ vehicleId: string; plate: string; tripCount: string }>();

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
