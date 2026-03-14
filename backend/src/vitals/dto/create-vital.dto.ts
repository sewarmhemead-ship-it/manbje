import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateVitalDto {
  @IsUUID()
  patientId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(300)
  heartRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  bloodPressure?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  oxygenSaturation?: number;

  @IsOptional()
  @IsNumber()
  @Min(35)
  @Max(42)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  painLevel?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
