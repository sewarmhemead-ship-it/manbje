import { IsString, IsIn } from 'class-validator';

export class PushTokenDto {
  @IsString()
  token: string;

  @IsIn(['ios', 'android'])
  platform: 'ios' | 'android';
}
