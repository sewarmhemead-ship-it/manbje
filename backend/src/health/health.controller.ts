import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { DataSource } from 'typeorm';
import { Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('health')
export class HealthController {
  constructor(private dataSource: DataSource) {}

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  async check(@Res({ passthrough: true }) res: Response): Promise<{ ok: boolean; db?: string }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { ok: true, db: 'connected' };
    } catch {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { ok: false, db: 'disconnected' };
    }
  }
}
