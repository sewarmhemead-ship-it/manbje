import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ArrivalType } from '../entities/appointment.entity';

export class CreateAppointmentDto {
  @IsUUID()
  doctorId: string;

  @IsUUID()
  patientId: string;

  @IsUUID()
  roomId: string;

  @IsOptional()
  @IsUUID()
  equipmentId?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsEnum(ArrivalType)
  arrivalType?: ArrivalType;

  @ValidateIf((o) => o.arrivalType === ArrivalType.CENTER_TRANSPORT)
  @IsString()
  @MaxLength(500)
  pickupAddress?: string;

  @ValidateIf((o) => o.arrivalType === ArrivalType.CENTER_TRANSPORT)
  @IsDateString()
  pickupTime?: string;

  @IsOptional()
  @IsString()
  completionStatus?: 'to_center_only' | 'from_center_only' | 'round_trip';

  @IsOptional()
  @IsString()
  mobilityNeed?: 'wheelchair' | 'stretcher' | 'walking';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
