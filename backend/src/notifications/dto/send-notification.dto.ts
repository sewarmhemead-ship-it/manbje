import { IsString, IsOptional, IsUUID, IsIn } from 'class-validator';

export class SendNotificationDto {
  @IsUUID()
  patientId: string;

  @IsString()
  type: string;

  @IsIn(['whatsapp', 'sms', 'app'])
  channel: 'whatsapp' | 'sms' | 'app';

  @IsOptional()
  vars?: Record<string, string>;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;
}

export class SendBulkNotificationDto {
  @IsUUID('4', { each: true })
  patientIds: string[];

  @IsString()
  type: string;

  @IsIn(['whatsapp', 'sms', 'app'])
  channel: 'whatsapp' | 'sms' | 'app';

  @IsOptional()
  vars?: Record<string, string>;
}

export class TestNotificationDto {
  @IsString()
  phone: string;

  @IsIn(['whatsapp', 'sms'])
  channel: 'whatsapp' | 'sms';

  @IsString()
  message: string;
}
