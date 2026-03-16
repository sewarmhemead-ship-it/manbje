import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from './entities/patient.entity';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { AuthModule } from '../auth/auth.module';
import { ClinicalSessionsModule } from '../clinical-sessions/clinical-sessions.module';
import { ExercisesModule } from '../exercises/exercises.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient]),
    forwardRef(() => AuthModule),
    ClinicalSessionsModule,
    forwardRef(() => ExercisesModule),
    AuditModule,
  ],
  providers: [PatientsService],
  controllers: [PatientsController],
  exports: [PatientsService],
})
export class PatientsModule {}
