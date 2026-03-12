import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from './entities/schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule)
    private schedulesRepo: Repository<Schedule>,
  ) {}

  async create(dto: CreateScheduleDto): Promise<Schedule> {
    const schedule = this.schedulesRepo.create({
      doctorId: dto.doctorId,
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });
    return this.schedulesRepo.save(schedule);
  }

  async findByDoctor(doctorId: string): Promise<Schedule[]> {
    return this.schedulesRepo.find({
      where: { doctorId },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
      relations: { doctor: true },
    });
  }

  /** يُستخدم للتحقق: هل الموعد يقع ضمن أوقات عمل الطبيب؟ */
  async isWithinDoctorAvailability(
    doctorId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<boolean> {
    const dayOfWeek = startTime.getDay();
    const startTimeStr = startTime.toTimeString().slice(0, 8);
    const endTimeStr = endTime.toTimeString().slice(0, 8);

    const slots = await this.schedulesRepo.find({
      where: { doctorId, dayOfWeek },
    });
    for (const slot of slots) {
      const s = this.normalizeTime(slot.startTime);
      const e = this.normalizeTime(slot.endTime);
      if (startTimeStr >= s && endTimeStr <= e) return true;
    }
    return false;
  }

  private normalizeTime(t: string): string {
    if (t.length === 5) return t + ':00';
    return t.slice(0, 8);
  }

  async findOne(id: string): Promise<Schedule> {
    const schedule = await this.schedulesRepo.findOne({
      where: { id },
      relations: { doctor: true },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');
    return schedule;
  }

  async remove(id: string): Promise<void> {
    const schedule = await this.findOne(id);
    await this.schedulesRepo.remove(schedule);
  }
}
