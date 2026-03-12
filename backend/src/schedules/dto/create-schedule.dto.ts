import { IsInt, IsString, Max, Min, Matches } from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  doctorId: string;

  /** 0 = Sunday, 1 = Monday, ... 6 = Saturday */
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  /** وقت البداية بصيغة HH:mm أو HH:mm:ss */
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'startTime must be HH:mm or HH:mm:ss',
  })
  startTime: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'endTime must be HH:mm or HH:mm:ss',
  })
  endTime: string;
}
