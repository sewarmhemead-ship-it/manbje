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
  ) {}

  async create(dto: CreateTransportRequestDto): Promise<TransportRequest> {
    const existing = await this.requestsRepo.findOne({
      where: { appointmentId: dto.appointmentId },
    });
    if (existing) {
      throw new ConflictException('A transport request already exists for this appointment');
    }
    const request = this.requestsRepo.create({
      appointmentId: dto.appointmentId,
      patientId: dto.patientId,
      pickupAddress: dto.pickupAddress,
      pickupTime: new Date(dto.pickupTime),
      completionStatus: dto.completionStatus ?? TransportCompletionStatus.TO_CENTER_ONLY,
      mobilityNeed: dto.mobilityNeed ?? null,
      notes: dto.notes ?? null,
    });
    return this.requestsRepo.save(request);
  }

  async findAll(): Promise<TransportRequest[]> {
    return this.requestsRepo.find({
      relations: { patient: true, driver: true, vehicle: true },
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
    for (const r of list) map.set(r.appointmentId, r);
    return map;
  }

  async findOne(id: string): Promise<TransportRequest> {
    const request = await this.requestsRepo.findOne({
      where: { id },
      relations: { driver: true, vehicle: true, patient: true },
    });
    if (!request) throw new NotFoundException('Transport request not found');
    return request;
  }

  async updateStatus(
    id: string,
    status: TransportRequestStatus,
  ): Promise<TransportRequest> {
    const request = await this.findOne(id);
    request.status = status;
    if (status === TransportRequestStatus.ARRIVED_AT_CENTER) {
      request.arrivedAtCenter = new Date();
      const timeStr = request.arrivedAtCenter.toLocaleTimeString('ar-SY', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const note = `المريض وصل إلى المركز عبر خدمة النقل في تمام الساعة ${timeStr}.`;
      await this.appointmentsService.appendNote(request.appointmentId, note);
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
          );
        }
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
  ): Promise<TransportRequest> {
    const request = await this.findOne(id);
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
        );
      }
    } catch {
      // ignore
    }
    return saved;
  }
}
