import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateEquipmentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
