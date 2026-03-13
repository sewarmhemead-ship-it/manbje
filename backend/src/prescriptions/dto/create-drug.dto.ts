import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { DrugForm, DrugCategory } from '../entities/drug.entity';

export class CreateDrugDto {
  @IsString()
  nameAr: string;

  @IsString()
  nameEn: string;

  @IsOptional()
  @IsString()
  genericName?: string;

  @IsNumber()
  defaultDose: number;

  @IsString()
  doseUnit: string;

  @IsEnum(DrugForm)
  form: DrugForm;

  @IsEnum(DrugCategory)
  category: DrugCategory;

  @IsOptional()
  @IsString()
  sideEffects?: string;

  @IsOptional()
  @IsString()
  contraindications?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
