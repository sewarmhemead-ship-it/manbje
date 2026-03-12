import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  TransportCompletionStatus,
  MobilityNeed,
} from '../entities/transport-request.entity';

export class CreateTransportRequestDto {
  @IsUUID()
  appointmentId: string;

  @IsUUID()
  patientId: string;

  @IsString()
  @MaxLength(500)
  pickupAddress: string;

  @IsDateString()
  pickupTime: string;

  @IsOptional()
  @IsEnum(TransportCompletionStatus)
  completionStatus?: TransportCompletionStatus;

  @IsOptional()
  @IsEnum(MobilityNeed)
  mobilityNeed?: MobilityNeed;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
