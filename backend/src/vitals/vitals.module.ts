import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vital } from './entities/vital.entity';
import { VitalsService } from './vitals.service';
import { VitalsController } from './vitals.controller';
import { PatientsModule } from '../patients/patients.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vital]),
    PatientsModule,
    AuthModule,
  ],
  providers: [VitalsService],
  controllers: [VitalsController],
  exports: [VitalsService],
})
export class VitalsModule {}
