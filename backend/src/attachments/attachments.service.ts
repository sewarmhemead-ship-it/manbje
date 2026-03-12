import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment, AttachmentFileType } from './entities/attachment.entity';
import { PatientsService } from '../patients/patients.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class AttachmentsService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly attachmentsDir = path.join(process.cwd(), 'uploads', 'attachments');

  /** للمستخدم في diskStorage عند الرفع */
  static get uploadPath(): string {
    const p = path.join(process.cwd(), 'uploads', 'attachments');
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    return p;
  }

  constructor(
    @InjectRepository(Attachment)
    private attachmentsRepo: Repository<Attachment>,
    private patientsService: PatientsService,
  ) {
    if (!fs.existsSync(this.attachmentsDir)) {
      fs.mkdirSync(this.attachmentsDir, { recursive: true });
    }
  }

  async create(
    patientId: string,
    file: Express.Multer.File,
    fileType: AttachmentFileType,
    description?: string,
    sessionId?: string,
  ): Promise<Attachment> {
    await this.patientsService.findOne(patientId);
    const relativePath = path.relative(this.uploadDir, file.path).replace(/\\/g, '/');

    const attachment = this.attachmentsRepo.create({
      patientId,
      sessionId: sessionId ?? null,
      fileUrl: relativePath,
      fileType,
      description: description ?? null,
      originalName: file.originalname ?? null,
    });
    return this.attachmentsRepo.save(attachment);
  }

  async findByPatient(patientId: string): Promise<Attachment[]> {
    return this.attachmentsRepo.find({
      where: { patientId },
      relations: { session: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Attachment> {
    const attachment = await this.attachmentsRepo.findOne({
      where: { id },
      relations: { patient: true, session: true },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  getAbsolutePath(relativePath: string): string {
    return path.join(this.uploadDir, relativePath);
  }
}
