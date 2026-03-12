import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import type { Handler } from 'aws-lambda';
import type { Request, Response } from 'express';

import { AppModule } from '../src/app.module';

let cachedServer: Handler | null = null;
let cachedExpressApp: express.Express | null = null;

/**
 * Bootstrap the NestJS app without calling listen().
 * Uses @vendia/serverless-express to wrap the Express app for Lambda-style invocation.
 * Exported for use in tests or alternate runtimes.
 */
export async function bootstrap(): Promise<{
  app: express.Express;
  handler: Handler;
}> {
  if (cachedExpressApp && cachedServer) {
    return { app: cachedExpressApp, handler: cachedServer };
  }

  const expressApp = express();
  const nestApp = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  nestApp.enableCors({ origin: process.env.CORS_ORIGIN ?? '*' });
  await nestApp.init();

  cachedExpressApp = expressApp;
  cachedServer = serverlessExpress({ app: expressApp }) as Handler;

  return { app: cachedExpressApp, handler: cachedServer };
}

/**
 * Vercel serverless handler: forwards (req, res) to the Express app from bootstrap.
 */
export default async function handler(
  req: Request,
  res: Response,
): Promise<void> {
  const { app } = await bootstrap();
  app(req, res);
}
