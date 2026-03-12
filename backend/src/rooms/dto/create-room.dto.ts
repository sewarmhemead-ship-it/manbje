import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  roomNumber: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
