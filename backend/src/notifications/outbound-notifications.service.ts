import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { OutboundNotification } from './entities/outbound-notification.entity';
import {
  NOTIFICATION_TEMPLATES,
  renderTemplate,
  getTemplateVariables,
} from './templates';
import { Patient } from '../patients/entities/patient.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { TransportRequest } from '../transport/entities/transport-request.entity';
import { PatientsService } from '../patients/patients.service';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './entities/notification.entity';

type SendResult = { success: boolean; externalId?: string; error?: string };

@Injectable()
export class OutboundNotificationsService {
  private twilioClient: unknown = null;

  constructor(
    @InjectRepository(OutboundNotification)
    private outboundRepo: Repository<OutboundNotification>,
    @InjectRepository(Patient)
    private patientRepo: Repository<Patient>,
    private patientsService: PatientsService,
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
    @InjectRepository(TransportRequest)
    private transportRepo: Repository<TransportRequest>,
    private notificationsService: NotificationsService,
  ) {
    this.initTwilio();
  }

  private initTwilio(): void {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (sid && token) {
      try {
        this.twilioClient = require('twilio')(sid, token);
      } catch {
        this.twilioClient = null;
      }
    }
  }

  async sendWhatsApp(to: string, message: string): Promise<SendResult> {
    const from = process.env.TWILIO_WHATSAPP_FROM;
    if (!from || !this.twilioClient) {
      console.log('[Mock WhatsApp]', { to, message: message.slice(0, 80) });
      return { success: true, externalId: 'mock-' + Date.now() };
    }
    try {
      const client = this.twilioClient as { messages: { create: (opts: unknown) => Promise<{ sid: string }> } };
      const result = await client.messages.create({
        from: 'whatsapp:' + from,
        to: to.startsWith('whatsapp:') ? to : 'whatsapp:' + to,
        body: message,
      });
      return { success: true, externalId: result.sid };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  async sendSMS(to: string, message: string): Promise<SendResult> {
    const from = process.env.TWILIO_SMS_FROM;
    if (!from || !this.twilioClient) {
      console.log('[Mock SMS]', { to, message: message.slice(0, 80) });
      return { success: true, externalId: 'mock-' + Date.now() };
    }
    try {
      const client = this.twilioClient as { messages: { create: (opts: unknown) => Promise<{ sid: string }> } };
      const result = await client.messages.create({
        from,
        to,
        body: message,
      });
      return { success: true, externalId: result.sid };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  async sendNotification(dto: {
    patientId: string;
    type: string;
    channel: 'whatsapp' | 'sms' | 'app';
    vars?: Record<string, string>;
    appointmentId?: string;
  }): Promise<OutboundNotification> {
    const patient = await this.patientRepo.findOne({
      where: { id: dto.patientId },
      select: ['id', 'phone', 'nameAr'],
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const templates = NOTIFICATION_TEMPLATES[dto.type];
    if (!templates) throw new BadRequestException('Unknown notification type');
    const rawTemplate = templates[dto.channel];
    if (!rawTemplate) throw new BadRequestException(`Channel ${dto.channel} not supported for type ${dto.type}`);

    const vars = { ...(dto.vars ?? {}), patientName: patient.nameAr ?? '' };
    const messageAr = renderTemplate(rawTemplate, vars);

    const record = this.outboundRepo.create({
      patientId: dto.patientId,
      type: dto.type,
      channel: dto.channel,
      messageAr,
      messageVars: dto.vars ? JSON.stringify(dto.vars) : null,
      status: 'pending',
      appointmentId: dto.appointmentId ?? null,
    });
    await this.outboundRepo.save(record);

    if (dto.channel === 'app') {
      record.status = 'sent';
      record.sentAt = new Date();
      record.externalId = 'app-' + Date.now();
      return this.outboundRepo.save(record);
    }

    const phone = (patient.phone || '').trim();
    if (!phone) {
      record.status = 'failed';
      record.errorMessage = 'Patient has no phone number';
      return this.outboundRepo.save(record);
    }

    const to = phone.startsWith('+') ? phone : '+' + phone.replace(/\D/g, '');
    const result =
      dto.channel === 'whatsapp'
        ? await this.sendWhatsApp(to, messageAr)
        : await this.sendSMS(to, messageAr);

    record.status = result.success ? 'sent' : 'failed';
    record.sentAt = result.success ? new Date() : null;
    record.externalId = result.externalId ?? null;
    record.errorMessage = result.error ?? null;
    return this.outboundRepo.save(record);
  }

  @Cron('0 */15 * * * *')
  async scheduleReminders(): Promise<void> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);
    const in2hStart = new Date(now.getTime() + 2 * 60 * 60 * 1000 - 15 * 60 * 1000);
    const in2hEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000 + 15 * 60 * 1000);

    const appointments24h = await this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.status = :status', { status: 'scheduled' })
      .andWhere('a.start_time >= :tomorrowStart', { tomorrowStart })
      .andWhere('a.start_time <= :tomorrowEnd', { tomorrowEnd })
      .leftJoinAndSelect('a.patient', 'patient')
      .leftJoinAndSelect('a.doctor', 'doctor')
      .leftJoinAndSelect('a.room', 'room')
      .getMany();
    const appointments2h = await this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.status = :status', { status: 'scheduled' })
      .andWhere('a.start_time >= :in2hStart', { in2hStart })
      .andWhere('a.start_time <= :in2hEnd', { in2hEnd })
      .leftJoinAndSelect('a.patient', 'patient')
      .leftJoinAndSelect('a.doctor', 'doctor')
      .getMany();

    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    for (const apt of appointments24h) {
      if (apt.startTime < tomorrowStart || apt.startTime > tomorrowEnd) continue;
      const existing = await this.outboundRepo.findOne({
        where: {
          patientId: apt.patientId,
          appointmentId: apt.id,
          type: 'appointment_reminder_24h',
        },
      });
      if (existing) continue;
      const startDate = new Date(apt.startTime);
      const channel = (apt.patient?.phone || '').startsWith('+') ? 'whatsapp' : 'sms';
      await this.sendNotification({
        patientId: apt.patientId,
        type: 'appointment_reminder_24h',
        channel,
        appointmentId: apt.id,
        vars: {
          patientName: apt.patient?.nameAr ?? '',
          dayName: dayNames[startDate.getDay()],
          time: startDate.toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' }),
          doctorName: (apt.doctor as { nameAr?: string })?.nameAr ?? '',
          roomName: (apt.room as { roomNumber?: string })?.roomNumber ?? '',
        },
      }).catch(() => {});
      if (apt.patient?.userId) {
        this.notificationsService.createNotification(
          apt.patient.userId,
          NotificationType.APPOINTMENT_REMINDER,
          'تذكير موعد غداً',
          `موعدك غداً الساعة ${startDate.toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })} مع ${(apt.doctor as { nameAr?: string })?.nameAr ?? 'الطبيب'}`,
          { appointmentId: apt.id },
          (apt as { companyId?: string | null }).companyId ?? undefined,
        ).catch(() => {});
      }
    }

    for (const apt of appointments2h) {
      const existing = await this.outboundRepo.findOne({
        where: {
          patientId: apt.patientId,
          appointmentId: apt.id,
          type: 'appointment_reminder_2h',
        },
      });
      if (existing) continue;
      const startDate = new Date(apt.startTime);
      const channel = (apt.patient?.phone || '').startsWith('+') ? 'whatsapp' : 'sms';
      await this.sendNotification({
        patientId: apt.patientId,
        type: 'appointment_reminder_2h',
        channel,
        appointmentId: apt.id,
        vars: {
          patientName: apt.patient?.nameAr ?? '',
          time: startDate.toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' }),
          doctorName: (apt.doctor as { nameAr?: string })?.nameAr ?? '',
        },
      }).catch(() => {});
      if (apt.patient?.userId) {
        this.notificationsService.createNotification(
          apt.patient.userId,
          NotificationType.APPOINTMENT_REMINDER,
          'تذكير موعد بعد ساعتين',
          `موعدك الساعة ${startDate.toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })} مع ${(apt.doctor as { nameAr?: string })?.nameAr ?? 'الطبيب'}`,
          { appointmentId: apt.id },
          (apt as { companyId?: string | null }).companyId ?? undefined,
        ).catch(() => {});
      }
    }
  }

  async findForPatientUserId(userId: string, limit = 10): Promise<OutboundNotification[]> {
    const patient = await this.patientsService.findByUserId(userId);
    if (!patient) return [];
    return this.findAll({ patientId: patient.id, limit });
  }

  async findAll(filters: {
    patientId?: string;
    type?: string;
    status?: string;
    limit?: number;
  }): Promise<OutboundNotification[]> {
    const qb = this.outboundRepo
      .createQueryBuilder('n')
      .leftJoinAndSelect('n.patient', 'patient')
      .leftJoinAndSelect('n.appointment', 'appointment')
      .orderBy('n.createdAt', 'DESC')
      .take(Math.min(100, filters.limit ?? 50));
    if (filters.patientId) qb.andWhere('n.patient_id = :patientId', { patientId: filters.patientId });
    if (filters.type) qb.andWhere('n.type = :type', { type: filters.type });
    if (filters.status) qb.andWhere('n.status = :status', { status: filters.status });
    return qb.getMany();
  }

  async getStats(): Promise<{
    sentToday: number;
    scheduled: number;
    failed: number;
    deliveryRate: number;
  }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [sentToday, scheduled, failed, totalSent] = await Promise.all([
      this.outboundRepo
        .createQueryBuilder('n')
        .where('n.status = :s', { s: 'sent' })
        .andWhere('n.sent_at >= :today', { today: todayStart })
        .getCount(),
      this.outboundRepo.count({ where: { status: 'pending' } }),
      this.outboundRepo.count({ where: { status: 'failed' } }),
      this.outboundRepo.count({ where: { status: 'sent' } }),
    ]);
    const totalWithOutcome = totalSent + failed;
    const deliveryRate = totalWithOutcome ? Math.round((totalSent / totalWithOutcome) * 100) : 0;
    return { sentToday, scheduled, failed, deliveryRate };
  }

  async retry(id: string): Promise<OutboundNotification> {
    const notification = await this.outboundRepo.findOne({
      where: { id },
      relations: { patient: true },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.status !== 'failed') throw new BadRequestException('Can only retry failed notifications');
    const phone = (notification.patient?.phone || '').trim();
    if (!phone && notification.channel !== 'app') throw new BadRequestException('Patient has no phone');
    const to = phone.startsWith('+') ? phone : '+' + phone.replace(/\D/g, '');
    const result =
      notification.channel === 'whatsapp'
        ? await this.sendWhatsApp(to, notification.messageAr)
        : notification.channel === 'sms'
          ? await this.sendSMS(to, notification.messageAr)
          : { success: true, externalId: 'app-retry' };
    notification.status = result.success ? 'sent' : 'failed';
    notification.sentAt = result.success ? new Date() : null;
    notification.externalId = result.externalId ?? null;
    notification.errorMessage = result.error ?? null;
    return this.outboundRepo.save(notification);
  }

  getTemplates(): Record<string, { channels: string[]; variables: string[] }> {
    const out: Record<string, { channels: string[]; variables: string[] }> = {};
    for (const [type, templates] of Object.entries(NOTIFICATION_TEMPLATES)) {
      const channels = Object.keys(templates) as string[];
      out[type] = { channels, variables: getTemplateVariables(type) };
    }
    return out;
  }

  getTemplatesWithPreview(): Record<string, { whatsapp?: string; sms?: string; app?: string; variables: string[] }> {
    const out: Record<string, { whatsapp?: string; sms?: string; app?: string; variables: string[] }> = {};
    for (const [type, templates] of Object.entries(NOTIFICATION_TEMPLATES)) {
      out[type] = {
        ...templates,
        variables: getTemplateVariables(type),
      };
    }
    return out;
  }

  async buildVarsForAppointment(
    appointmentId: string,
    patientName: string,
  ): Promise<Record<string, string>> {
    const apt = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: { doctor: true, room: true },
    });
    if (!apt) return { patientName };
    const start = new Date(apt.startTime);
    return {
      patientName,
      date: start.toLocaleDateString('ar-SY'),
      time: start.toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' }),
      doctorName: (apt.doctor as { nameAr?: string })?.nameAr ?? '',
      roomName: (apt.room as { roomNumber?: string })?.roomNumber ?? '',
    };
  }

  async buildVarsForTransport(
    transportRequestId: string,
  ): Promise<Record<string, string>> {
    const req = await this.transportRepo.findOne({
      where: { id: transportRequestId },
      relations: { driver: { user: true }, vehicle: true },
    });
    if (!req?.driver?.user || !req.vehicle) {
      return { driverName: '', plateNumber: '', eta: '' };
    }
    const driverName = (req.driver.user as { nameAr?: string })?.nameAr ?? '';
    const plateNumber = req.vehicle.plateNumber ?? '';
    const eta = req.pickupTime
      ? new Date(req.pickupTime).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })
      : '';
    return { driverName, plateNumber, eta };
  }
}
