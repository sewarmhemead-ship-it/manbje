import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreatePatientExerciseDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  exerciseId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  frequency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;
}
