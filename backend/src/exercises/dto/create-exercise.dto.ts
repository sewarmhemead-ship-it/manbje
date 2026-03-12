import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateExerciseDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  targetMuscles?: string;
}
