import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  Appointment,
  AppointmentStatus,
  ArrivalType,
} from './entities/appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { SchedulesService } from '../schedules/schedules.service';
import { RoomsService } from '../rooms/rooms.service';
import { EquipmentService } from '../equipment/equipment.service';
import { PatientsService } from '../patients/patients.service';
import { TransportRequestsService } from '../transport/transport-requests.service';
import {
  TransportCompletionStatus,
  MobilityNeed,
} from '../transport/entities/transport-request.entity';
import { BillingService } from '../billing/billing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OutboundNotificationsService } from '../notifications/outbound-notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentsRepo: Repository<Appointment>,
    private schedulesService: SchedulesService,
    private roomsService: RoomsService,
    private equipmentService: EquipmentService,
    private patientsService: PatientsService,
    @Inject(forwardRef(() => TransportRequestsService))
    private transportRequestsService: TransportRequestsService,
    private billingService: BillingService,
    private notificationsService: NotificationsService,
    private outboundNotificationsService: OutboundNotificationsService,
  ) {}

  async create(dto: CreateAppointmentDto, companyId: string): Promise<Appointment> {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }

    await this.roomsService.findOne(dto.roomId, companyId);
    await this.patientsService.findOne(dto.patientId, companyId);
    if (dto.equipmentId) {
      const eq = await this.equipmentService.findOne(dto.equipmentId, companyId);
      if (!eq.isAvailable) {
        throw new ConflictException('Selected equipment is not available');
      }
    }

    const withinAvailability = await this.schedulesService.isWithinDoctorAvailability(
      dto.doctorId,
      startTime,
      endTime,
    );
    if (!withinAvailability) {
      throw new ConflictException(
        'The requested time is outside the doctor\'s working hours',
      );
    }

    const doctorOverlap = await this.hasOverlap({
      doctorId: dto.doctorId,
      startTime,
      endTime,
      excludeId: undefined,
    });
    if (doctorOverlap) {
      throw new ConflictException(
        'The doctor already has another appointment at this time',
      );
    }

    const roomOverlap = await this.hasOverlap({
      roomId: dto.roomId,
      startTime,
      endTime,
      excludeId: undefined,
    });
    if (roomOverlap) {
      throw new ConflictException(
        'The selected room is already booked for another appointment at this time',
      );
    }

    if (dto.equipmentId) {
      const equipmentOverlap = await this.hasOverlap({
        equipmentId: dto.equipmentId,
        startTime,
        endTime,
        excludeId: undefined,
      });
      if (equipmentOverlap) {
        throw new ConflictException(
          'The selected equipment is already booked for another appointment at this time',
        );
      }
    }

    const arrivalType = dto.arrivalType ?? ArrivalType.SELF_ARRIVAL;
    if (arrivalType === ArrivalType.CENTER_TRANSPORT) {
      if (!dto.pickupAddress?.trim() || !dto.pickupTime) {
        throw new BadRequestException(
          'pickupAddress and pickupTime are required when arrivalType is center_transport',
        );
      }
    }

    const appointment = this.appointmentsRepo.create({
      companyId,
      doctorId: dto.doctorId,
      patientId: dto.patientId,
      roomId: dto.roomId,
      equipmentId: dto.equipmentId ?? null,
      startTime,
      endTime,
      status: AppointmentStatus.SCHEDULED,
      arrivalType,
      transportRequestId: null,
      notes: dto.notes ?? null,
    });
    const saved = await this.appointmentsRepo.save(appointment);

    try {
      await this.notificationsService.createNotification(
        saved.doctorId,
        NotificationType.APPOINTMENT_NEW,
        'موعد جديد',
        `تم جدولة موعد جديد للمريض`,
        { appointmentId: saved.id },
        companyId ?? undefined,
      );
    } catch {
      // ignore
    }

    try {
      const patient = await this.patientsService.findOne(saved.patientId);
      const vars = await this.outboundNotificationsService.buildVarsForAppointment(
        saved.id,
        patient.nameAr ?? '',
      );
      const channel = (patient.phone || '').trim().startsWith('+') ? 'whatsapp' : 'sms';
      await this.outboundNotificationsService.sendNotification({
        patientId: saved.patientId,
        type: 'appointment_confirmed',
        channel,
        vars,
        appointmentId: saved.id,
      });
    } catch {
      // ignore
    }

    if (arrivalType === ArrivalType.CENTER_TRANSPORT && dto.pickupAddress && dto.pickupTime) {
      const completionStatus =
        dto.completionStatus === 'from_center_only'
          ? TransportCompletionStatus.FROM_CENTER_ONLY
          : dto.completionStatus === 'round_trip'
            ? TransportCompletionStatus.ROUND_TRIP
            : TransportCompletionStatus.TO_CENTER_ONLY;
      const mobilityNeed =
        dto.mobilityNeed === 'wheelchair'
          ? MobilityNeed.WHEELCHAIR
          : dto.mobilityNeed === 'stretcher'
            ? MobilityNeed.STRETCHER
            : dto.mobilityNeed === 'walking'
              ? MobilityNeed.WALKING
              : null;
      const request = await this.transportRequestsService.create(
        {
          appointmentId: saved.id,
          patientId: dto.patientId,
          pickupAddress: dto.pickupAddress,
          pickupTime: dto.pickupTime,
          completionStatus,
          mobilityNeed: mobilityNeed ?? undefined,
        },
        companyId,
      );
      saved.transportRequestId = request.id;
      await this.appointmentsRepo.save(saved);
    }

    return saved;
  }

  private async hasOverlap(params: {
    doctorId?: string;
    roomId?: string;
    equipmentId?: string;
    startTime: Date;
    endTime: Date;
    excludeId?: string;
  }): Promise<boolean> {
    const qb = this.appointmentsRepo
      .createQueryBuilder('a')
      .where('a.status != :cancelled', { cancelled: AppointmentStatus.CANCELLED })
      .andWhere('a.start_time < :endTime', { endTime: params.endTime })
      .andWhere('a.end_time > :startTime', { startTime: params.startTime });

    if (params.doctorId) qb.andWhere('a.doctor_id = :doctorId', { doctorId: params.doctorId });
    if (params.roomId) qb.andWhere('a.room_id = :roomId', { roomId: params.roomId });
    if (params.equipmentId) {
      qb.andWhere('a.equipment_id = :equipmentId', {
        equipmentId: params.equipmentId,
      });
    }
    if (params.excludeId) {
      qb.andWhere('a.id != :excludeId', { excludeId: params.excludeId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  async findAllInRange(startDate: string, endDate: string, companyId?: string | null): Promise<Appointment[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const where: any = { startTime: Between(start, end) };
    if (companyId) where.companyId = companyId;
    const list = await this.appointmentsRepo.find({
      where,
      relations: { patient: true, doctor: true, room: true, equipment: true },
      order: { startTime: 'ASC' },
    });
    return this.enrichAppointmentsWithTransport(list);
  }

  async findByDoctor(
    doctorId: string,
    startDate: string,
    endDate: string,
    companyId?: string | null,
  ): Promise<Appointment[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const where: any = { doctorId, startTime: Between(start, end) };
    if (companyId) where.companyId = companyId;
    const list = await this.appointmentsRepo.find({
      where,
      relations: { patient: true, doctor: true, room: true, equipment: true },
      order: { startTime: 'ASC' },
    });
    return this.enrichAppointmentsWithTransport(list);
  }

  async findByPatient(
    patientId: string,
    status?: string,
    limit?: number,
  ): Promise<Appointment[]> {
    const where: { patientId: string; status?: AppointmentStatus } = { patientId };
    if (status) where.status = status as AppointmentStatus;
    const list = await this.appointmentsRepo.find({
      where,
      relations: { doctor: true, room: true, equipment: true },
      order: { startTime: status === 'scheduled' ? 'ASC' : 'DESC' },
      take: limit,
    });
    return this.enrichAppointmentsWithTransport(list);
  }

  async findOne(id: string): Promise<Appointment> {
    const appointment = await this.appointmentsRepo.findOne({
      where: { id },
      relations: { doctor: true, patient: true, room: true, equipment: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    const [enriched] = await this.enrichAppointmentsWithTransport([appointment]);
    return enriched;
  }

  private async enrichAppointmentsWithTransport(
    appointments: Appointment[],
  ): Promise<Appointment[]> {
    const ids = appointments
      .filter((a) => a.transportRequestId)
      .map((a) => a.id);
    const transportMap =
      ids.length > 0
        ? await this.transportRequestsService.getByAppointmentIds(ids)
        : new Map<string, any>();
    return appointments.map((a) => {
      const out = { ...a } as Appointment & { arrivalDisplayText?: string; transportRequest?: any };
      out.arrivalDisplayText =
        a.arrivalType === ArrivalType.CENTER_TRANSPORT
          ? 'المريض قادم بالسيارة الخاصة بالمركز'
          : 'قادم بمفرده';
      if (a.transportRequestId) {
        out.transportRequest = transportMap.get(a.id) ?? null;
      }
      return out;
    });
  }

  async updateStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
    const appointment = await this.findOne(id);
    const wasCompleted = appointment.status === AppointmentStatus.COMPLETED;
    appointment.status = status;
    const saved = await this.appointmentsRepo.save(appointment);

    if (status === AppointmentStatus.COMPLETED && !wasCompleted) {
      try {
        const patient = await this.patientsService.findOne(appointment.patientId);
        const companyId = appointment.companyId ?? undefined;
        if (companyId) {
          await this.billingService.createForCompletedAppointment(companyId, {
            patientId: appointment.patientId,
            appointmentId: appointment.id,
            sessionAmount: 100,
            hasTransport: !!appointment.transportRequestId,
            transportAmount: appointment.transportRequestId ? 50 : undefined,
            insuranceProvider: patient.insuranceCompany ?? null,
          });
        }
      } catch {
        // Don't fail the status update if invoice creation fails
      }
    }

    if (status === AppointmentStatus.CANCELLED) {
      try {
        const notifCompanyId = appointment.companyId ?? undefined;
        await this.notificationsService.createNotification(
          appointment.doctorId,
          NotificationType.APPOINTMENT_CANCELLED,
          'إلغاء موعد',
          'تم إلغاء موعد',
          { appointmentId: appointment.id },
          notifCompanyId,
        );
        const patient = await this.patientsService.findOne(appointment.patientId);
        if (patient.userId) {
          await this.notificationsService.createNotification(
            patient.userId,
            NotificationType.APPOINTMENT_CANCELLED,
            'إلغاء موعد',
            'تم إلغاء موعدك',
            { appointmentId: appointment.id },
            notifCompanyId,
          );
        }
        const vars = await this.outboundNotificationsService.buildVarsForAppointment(
          appointment.id,
          patient.nameAr ?? '',
        );
        const channel = (patient.phone || '').trim().startsWith('+') ? 'whatsapp' : 'sms';
        await this.outboundNotificationsService.sendNotification({
          patientId: appointment.patientId,
          type: 'appointment_cancelled',
          channel,
          vars,
          appointmentId: appointment.id,
        });
      } catch {
        // ignore
      }
    }
    return saved;
  }

  async appendNote(appointmentId: string, noteToAppend: string): Promise<void> {
    const appointment = await this.appointmentsRepo.findOne({
      where: { id: appointmentId },
    });
    if (!appointment) return;
    const separator = appointment.notes?.trim() ? '\n' : '';
    appointment.notes = (appointment.notes ?? '') + separator + noteToAppend;
    await this.appointmentsRepo.save(appointment);
  }

  async rate(id: string, patientId: string, stars: number, comment?: string | null): Promise<Appointment> {
    const appointment = await this.findOne(id);
    if (appointment.patientId !== patientId) {
      throw new BadRequestException('You can only rate your own appointments');
    }
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException('You can only rate completed appointments');
    }
    if (stars < 1 || stars > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }
    appointment.patientRating = stars;
    appointment.patientComment = comment ?? null;
    return this.appointmentsRepo.save(appointment);
  }

  async cancelByPatient(id: string, patientId: string): Promise<Appointment> {
    const appointment = await this.findOne(id);
    if (appointment.patientId !== patientId) {
      throw new BadRequestException('You can only cancel your own appointments');
    }
    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException('Only scheduled appointments can be cancelled');
    }
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    if (new Date(appointment.startTime) <= twoHoursFromNow) {
      throw new BadRequestException('Cannot cancel appointment less than 2 hours before start');
    }
    return this.updateStatus(id, AppointmentStatus.CANCELLED);
  }
}
