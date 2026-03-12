import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicalSession } from './entities/clinical-session.entity';
import { ClinicalSessionsService } from './clinical-sessions.service';
import { ClinicalSessionsController } from './clinical-sessions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ClinicalSession])],
  providers: [ClinicalSessionsService],
  controllers: [ClinicalSessionsController],
  exports: [ClinicalSessionsService],
})
export class ClinicalSessionsModule {}
