import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicalSession } from './entities/clinical-session.entity';
import { CreateClinicalSessionDto } from './dto/create-clinical-session.dto';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class ClinicalSessionsService {
  constructor(
    @InjectRepository(ClinicalSession)
    private sessionsRepo: Repository<ClinicalSession>,
    private dataSource: DataSource,
  ) {}

  async create(dto: CreateClinicalSessionDto, doctorId: string): Promise<ClinicalSession> {
    const appointment = await this.dataSource.getRepository(Appointment).findOne({
      where: { id: dto.appointmentId },
      relations: { patient: true },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (appointment.doctorId !== doctorId) {
      throw new ForbiddenException('You can only add a clinical session for your own appointments');
    }
    const existing = await this.sessionsRepo.findOne({
      where: { appointmentId: dto.appointmentId },
    });
    if (existing) {
      throw new ConflictException('A clinical session already exists for this appointment');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const session = queryRunner.manager.create(ClinicalSession, {
        appointmentId: dto.appointmentId,
        subjective: dto.subjective ?? null,
        objective: dto.objective ?? null,
        assessment: dto.assessment ?? null,
        plan: dto.plan ?? null,
        recoveryScore: dto.recoveryScore ?? null,
        therapistNotes: dto.therapistNotes ?? null,
      });
      const saved = await queryRunner.manager.save(ClinicalSession, session);
      await queryRunner.manager.update(
        Appointment,
        { id: dto.appointmentId },
        { status: AppointmentStatus.COMPLETED },
      );
      await queryRunner.commitTransaction();
      return this.sessionsRepo.findOne({
        where: { id: saved.id },
        relations: { appointment: true },
      }) as Promise<ClinicalSession>;
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async findByAppointmentId(appointmentId: string): Promise<ClinicalSession | null> {
    return this.sessionsRepo.findOne({
      where: { appointmentId },
      relations: { appointment: true },
    });
  }

  async findByPatientId(patientId: string): Promise<ClinicalSession[]> {
    return this.sessionsRepo
      .createQueryBuilder('cs')
      .innerJoinAndSelect('cs.appointment', 'a')
      .leftJoinAndSelect('a.doctor', 'doctor')
      .leftJoinAndSelect('a.room', 'room')
      .leftJoinAndSelect('a.equipment', 'equipment')
      .where('a.patient_id = :patientId', { patientId })
      .orderBy('a.start_time', 'DESC')
      .getMany();
  }

  async findAll(startDate?: string, endDate?: string): Promise<ClinicalSession[]> {
    const qb = this.sessionsRepo
      .createQueryBuilder('cs')
      .innerJoinAndSelect('cs.appointment', 'a')
      .leftJoinAndSelect('a.patient', 'patient')
      .leftJoinAndSelect('a.doctor', 'doctor')
      .orderBy('a.start_time', 'DESC');
    if (startDate) {
      qb.andWhere('a.start_time >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('a.start_time <= :endDate', { endDate: endDate + 'T23:59:59.999Z' });
    }
    return qb.getMany();
  }

  async getRecoveryHistory(patientId: string): Promise<{ date: string; recoveryScore: number }[]> {
    const rows = await this.sessionsRepo
      .createQueryBuilder('cs')
      .innerJoinAndSelect('cs.appointment', 'a')
      .where('a.patient_id = :patientId', { patientId })
      .andWhere('cs.recovery_score IS NOT NULL')
      .orderBy('a.start_time', 'ASC')
      .getMany();
    return rows.map((cs) => ({
      date: cs.appointment.startTime.toISOString().slice(0, 10),
      recoveryScore: cs.recoveryScore as number,
    }));
  }
}
