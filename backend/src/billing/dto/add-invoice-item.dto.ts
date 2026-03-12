import { IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ItemCategory } from '../entities/invoice-item.entity';

export class AddInvoiceItemDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice: number;

  @IsEnum(ItemCategory)
  category: ItemCategory;
}
