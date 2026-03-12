import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AttachmentsService } from './attachments.service';
import { AttachmentFileType } from './entities/attachment.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { PatientsService } from '../patients/patients.service';

@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(
    private attachmentsService: AttachmentsService,
    private patientsService: PatientsService,
  ) {}

  @Post('upload')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, AttachmentsService.uploadPath);
        },
        filename: (_req, file, cb) => {
          const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          cb(null, name + extname(file.originalname || ''));
        },
      }),
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('patientId') patientId: string,
    @Body('fileType') fileType: string,
    @Body('description') description?: string,
    @Body('sessionId') sessionId?: string,
  ) {
    if (!file || !file.path) {
      throw new BadRequestException('File is required');
    }
    if (!patientId) {
      throw new BadRequestException('patientId is required');
    }
    const type = this.parseFileType(fileType);
    return this.attachmentsService.create(
      patientId,
      file,
      type,
      description,
      sessionId,
    );
  }

  @Get('patient/:patientId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  async findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: User,
  ) {
    if (user.role === UserRole.PATIENT) {
      const myPatient = await this.patientsService.findByUserId(user.id);
      if (!myPatient || myPatient.id !== patientId) {
        throw new ForbiddenException('You can only view your own attachments');
      }
    }
    return this.attachmentsService.findByPatient(patientId);
  }

  private parseFileType(value: string): AttachmentFileType {
    const v = (value || '').toLowerCase();
    if (v === 'xray' || v === 'x-ray') return AttachmentFileType.X_RAY;
    if (v === 'mri') return AttachmentFileType.MRI;
    if (v === 'report') return AttachmentFileType.REPORT;
    return AttachmentFileType.REPORT;
  }
}
