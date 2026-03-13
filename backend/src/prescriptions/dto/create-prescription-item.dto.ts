import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreatePrescriptionItemDto {
  @IsString()
  drugId: string;

  @IsNumber()
  dose: number;

  @IsString()
  doseUnit: string;

  @IsString()
  frequency: string;

  @IsNumber()
  durationDays: number;

  @IsOptional()
  @IsString()
  timing?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
