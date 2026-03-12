import { IsEnum } from 'class-validator';
import { TransportRequestStatus } from '../entities/transport-request.entity';

export class UpdateTransportStatusDto {
  @IsEnum(TransportRequestStatus)
  status: TransportRequestStatus;
}
