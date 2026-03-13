import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Drug } from './entities/drug.entity';
import { Prescription } from './entities/prescription.entity';
import { PrescriptionItem } from './entities/prescription-item.entity';
import { DrugsService } from './drugs.service';
import { PrescriptionsService } from './prescriptions.service';
import { DrugsController } from './drugs.controller';
import { PrescriptionsController } from './prescriptions.controller';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Drug, Prescription, PrescriptionItem]),
    PatientsModule,
  ],
  controllers: [DrugsController, PrescriptionsController],
  providers: [DrugsService, PrescriptionsService],
  exports: [DrugsService, PrescriptionsService],
})
export class PrescriptionsModule {}
