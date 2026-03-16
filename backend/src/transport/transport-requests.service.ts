import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TransportRequest,
  TransportRequestStatus,
  TransportCompletionStatus,
} from './entities/transport-request.entity';
import { CreateTransportRequestDto } from './dto/create-transport-request.dto';
import { AppointmentsService } from '../appointments/appointments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OutboundNotificationsService } from '../notifications/outbound-notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { TransportDriver } from './entities/transport-driver.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class TransportRequestsService {
  constructor(
    @InjectRepository(TransportRequest)
    private requestsRepo: Repository<TransportRequest>,
    @InjectRepository(TransportDriver)
    private driversRepo: Repository<TransportDriver>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @Inject(forwardRef(() => AppointmentsService))
    private appointmentsService: AppointmentsService,
    private notificationsService: NotificationsService,
    private outboundNotificationsService: OutboundNotificationsService,
  ) {}

  async create(dto: CreateTransportRequestDto, companyId: string): Promise<TransportRequest> {
    if (dto.appointmentId) {
      const existing = await this.requestsRepo.findOne({
        where: { appointmentId: dto.appointmentId },
      });
      if (existing) {
        throw new ConflictException('A transport request already exists for this appointment');
      }
    }
    const request = this.requestsRepo.create({
      companyId: companyId!,
      appointmentId: dto.appointmentId ?? null,
      patientId: dto.patientId,
      pickupAddress: dto.pickupAddress,
      pickupTime: new Date(dto.pickupTime),
      completionStatus: dto.completionStatus ?? TransportCompletionStatus.TO_CENTER_ONLY,
      mobilityNeed: dto.mobilityNeed ?? null,
      notes: dto.notes ?? null,
    });
    return this.requestsRepo.save(request);
  }

  async findAll(companyId?: string | null, driverId?: string): Promise<TransportRequest[]> {
    const where: any = driverId ? { driverId } : {};
    if (!driverId && companyId) where.companyId = companyId;
    return this.requestsRepo.find({
      where: Object.keys(where).length ? where : {},
      relations: {
        patient: { user: true },
        driver: { user: true, vehicle: true },
        vehicle: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findByAppointmentId(appointmentId: string): Promise<TransportRequest | null> {
    return this.requestsRepo.findOne({
      where: { appointmentId },
      relations: { driver: true, vehicle: true, patient: true },
    });
  }

  async getByAppointmentIds(appointmentIds: string[]): Promise<Map<string, TransportRequest>> {
    if (appointmentIds.length === 0) return new Map();
    const list = await this.requestsRepo.find({
      where: appointmentIds.map((id) => ({ appointmentId: id })),
      relations: { driver: true, vehicle: true },
    });
    const map = new Map<string, TransportRequest>();
    for (const r of list) {
      const aid = r.appointmentId ?? '';
      if (aid) map.set(aid, r);
    }
    return map;
  }

  async findOne(id: string, companyId?: string | null): Promise<TransportRequest> {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const request = await this.requestsRepo.findOne({
      where,
      relations: { driver: true, vehicle: true, patient: true },
    });
    if (!request) throw new NotFoundException('Transport request not found');
    return request;
  }

  async updateStatus(
    id: string,
    status: TransportRequestStatus,
    companyId?: string | null,
  ): Promise<TransportRequest> {
    const request = await this.findOne(id, companyId);
    request.status = status;
    if (status === TransportRequestStatus.ARRIVED_AT_CENTER) {
      request.arrivedAtCenter = new Date();
      const timeStr = request.arrivedAtCenter.toLocaleTimeString('ar-SY', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const note = `المريض وصل إلى المركز عبر خدمة النقل في تمام الساعة ${timeStr}.`;
      const appointmentId = request.appointmentId ?? '';
      if (appointmentId) await this.appointmentsService.appendNote(appointmentId, note);
      try {
        const admin = await this.usersRepo.findOne({
          where: { role: UserRole.ADMIN },
          select: ['id'],
        });
        if (admin) {
          await this.notificationsService.createNotification(
            admin.id,
            NotificationType.TRANSPORT_ARRIVED,
            'وصول النقل',
            'المريض وصل إلى المركز عبر خدمة النقل',
            { transportRequestId: id, appointmentId: request.appointmentId },
            request.companyId ?? undefined,
          );
        }
        const vars = await this.outboundNotificationsService.buildVarsForTransport(id);
        await this.outboundNotificationsService.sendNotification({
          patientId: request.patientId,
          type: 'transport_arrived',
          channel: 'whatsapp',
          vars,
        });
      } catch {
        // ignore
      }
    }
    if (status === TransportRequestStatus.COMPLETED) {
      request.completedAt = new Date();
    }
    return this.requestsRepo.save(request);
  }

  async assignDriverAndVehicle(
    id: string,
    driverId: string,
    vehicleId: string,
    companyId?: string | null,
  ): Promise<TransportRequest> {
    const request = await this.findOne(id, companyId);
    if (request.status !== TransportRequestStatus.REQUESTED) {
      throw new BadRequestException('Can only assign driver/vehicle to requested trips');
    }
    request.driverId = driverId;
    request.vehicleId = vehicleId;
    request.status = TransportRequestStatus.ASSIGNED;
    const saved = await this.requestsRepo.save(request);
    try {
      const driver = await this.driversRepo.findOne({ where: { id: driverId } });
      if (driver?.userId) {
        await this.notificationsService.createNotification(
          driver.userId,
          NotificationType.TRANSPORT_ASSIGNED,
          'تم تعيينك لرحلة',
          'تم تعيينك لرحلة نقل مريض',
          { transportRequestId: id },
          request.companyId ?? companyId ?? undefined,
        );
      }
      const vars = await this.outboundNotificationsService.buildVarsForTransport(id);
      await this.outboundNotificationsService.sendNotification({
        patientId: request.patientId,
        type: 'transport_assigned',
        channel: 'whatsapp',
        vars,
      });
    } catch {
      // ignore
    }
    return saved;
  }
}
