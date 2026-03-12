import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { OutboundNotificationsService } from './outbound-notifications.service';
import { SendNotificationDto, SendBulkNotificationDto, TestNotificationDto } from './dto/send-notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private outboundService: OutboundNotificationsService) {}

  @Get('me')
  findMy(@CurrentUser() user: User, @Query('limit') limit?: string) {
    return this.outboundService.findForPatientUserId(user.id, limit ? parseInt(limit, 10) : 10);
  }

  @Get()
  findAll(
    @Query('patientId') patientId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.outboundService.findAll({
      patientId,
      type,
      status,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('stats')
  getStats() {
    return this.outboundService.getStats();
  }

  @Post('send')
  send(@Body() dto: SendNotificationDto) {
    return this.outboundService.sendNotification({
      patientId: dto.patientId,
      type: dto.type,
      channel: dto.channel,
      vars: dto.vars,
      appointmentId: dto.appointmentId,
    });
  }

  @Post('send-bulk')
  async sendBulk(@Body() dto: SendBulkNotificationDto) {
    const results = [];
    for (const patientId of dto.patientIds) {
      try {
        const n = await this.outboundService.sendNotification({
          patientId,
          type: dto.type,
          channel: dto.channel,
          vars: dto.vars,
        });
        results.push({ patientId, success: true, id: n.id });
      } catch (e) {
        results.push({ patientId, success: false, error: (e as Error).message });
      }
    }
    return { results };
  }

  @Post('test')
  async test(@Body() dto: TestNotificationDto) {
    const to = dto.phone.startsWith('+') ? dto.phone : '+' + dto.phone.replace(/\D/g, '');
    const result =
      dto.channel === 'whatsapp'
        ? await this.outboundService.sendWhatsApp(to, dto.message)
        : await this.outboundService.sendSMS(to, dto.message);
    return result;
  }

  @Patch(':id/retry')
  retry(@Param('id', ParseUUIDPipe) id: string) {
    return this.outboundService.retry(id);
  }

  @Get('templates')
  getTemplates() {
    return this.outboundService.getTemplatesWithPreview();
  }
}
