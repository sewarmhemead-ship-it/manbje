import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './entities/room.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomsRepo: Repository<Room>,
  ) {}

  async create(dto: CreateRoomDto, companyId: string): Promise<Room> {
    const room = this.roomsRepo.create({
      companyId,
      roomNumber: dto.roomNumber,
      type: dto.type ?? null,
      isActive: dto.isActive ?? true,
    });
    return this.roomsRepo.save(room);
  }

  async findAll(companyId: string | null, activeOnly = false): Promise<Room[]> {
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (activeOnly) where.isActive = true;
    return this.roomsRepo.find({
      where: Object.keys(where).length ? where : undefined,
      order: { roomNumber: 'ASC' },
    });
  }

  async findOne(id: string, companyId?: string | null): Promise<Room> {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const room = await this.roomsRepo.findOne({ where });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async update(id: string, dto: UpdateRoomDto, companyId?: string | null): Promise<Room> {
    const room = await this.findOne(id, companyId);
    Object.assign(room, dto);
    return this.roomsRepo.save(room);
  }

  async remove(id: string, companyId?: string | null): Promise<void> {
    const room = await this.findOne(id, companyId);
    await this.roomsRepo.remove(room);
  }
}
