import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateClinicalSessionDto {
  @IsUUID()
  appointmentId: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  subjective?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  objective?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  assessment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  plan?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  recoveryScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  therapistNotes?: string;
}
