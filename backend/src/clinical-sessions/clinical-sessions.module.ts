import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicalSession } from './entities/clinical-session.entity';
import { ClinicalSessionsService } from './clinical-sessions.service';
import { ClinicalSessionsController } from './clinical-sessions.controller';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [TypeOrmModule.forFeature([ClinicalSession]), forwardRef(() => PatientsModule)],
  providers: [ClinicalSessionsService],
  controllers: [ClinicalSessionsController],
  exports: [ClinicalSessionsService],
})
export class ClinicalSessionsModule {}
