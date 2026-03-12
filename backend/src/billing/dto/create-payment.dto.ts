import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethodEnum } from '../entities/invoice.entity';

export class CreatePaymentDto {
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @IsEnum(PaymentMethodEnum)
  method: PaymentMethodEnum;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  insuranceClaimNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
