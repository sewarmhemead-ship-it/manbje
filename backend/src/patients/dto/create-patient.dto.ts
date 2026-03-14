import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreatePatientDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsString()
  @MaxLength(200)
  nameAr: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  insuranceCompany?: string;

  @IsOptional()
  @IsString()
  insurancePolicyNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  diagnosis?: string;

  @IsOptional()
  @IsUUID()
  assignedDoctorId?: string;

  @IsOptional()
  @IsString()
  arrivalPreference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mobilityAid?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
