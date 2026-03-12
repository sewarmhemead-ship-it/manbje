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

  async create(dto: CreateRoomDto): Promise<Room> {
    const room = this.roomsRepo.create({
      roomNumber: dto.roomNumber,
      type: dto.type ?? null,
      isActive: dto.isActive ?? true,
    });
    return this.roomsRepo.save(room);
  }

  async findAll(activeOnly = false): Promise<Room[]> {
    return this.roomsRepo.find({
      where: activeOnly ? { isActive: true } : undefined,
      order: { roomNumber: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Room> {
    const room = await this.roomsRepo.findOne({ where: { id } });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async update(id: string, dto: UpdateRoomDto): Promise<Room> {
    const room = await this.findOne(id);
    Object.assign(room, dto);
    return this.roomsRepo.save(room);
  }

  async remove(id: string): Promise<void> {
    const room = await this.findOne(id);
    await this.roomsRepo.remove(room);
  }
}
