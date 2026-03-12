import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';
import type { INestApplication } from '@nestjs/common';
import type { Request, Response } from 'express';

const API_PREFIX = '/api/nest';

let appPromise: Promise<INestApplication> | null = null;

async function getApp(): Promise<INestApplication> {
  if (!appPromise) {
    appPromise = (async () => {
      const expressApp = express();
      const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: { enableImplicitConversion: true },
        }),
      );
      app.enableCors({ origin: process.env.CORS_ORIGIN ?? '*' });
      await app.init();
      return app;
    })();
  }
  return appPromise;
}

/**
 * Vercel serverless handler. Rewrites path so Nest receives e.g. /users instead of /api/nest/users.
 */
export default async function handler(req: Request, res: Response): Promise<void> {
  const app = await getApp();
  const expressInstance = app.getHttpAdapter().getInstance();

  let path = (req.url || '/').split('?')[0];
  if (path.startsWith(API_PREFIX)) {
    path = path.slice(API_PREFIX.length) || '/';
  }
  req.url = path + (req.url?.includes('?') ? '?' + req.url.split('?')[1] : '');
  expressInstance(req, res);
}
