import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import * as pg from 'pg';
import * as express from 'express';
import { join } from 'path';

// Parse date columns as exact strings instead of Date objects in local time
pg.types.setTypeParser(pg.types.builtins.DATE, (val: string) => val);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security middlewares
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());

  // Serve static files from the uploads directory
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // CORS configuration
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'https://finca-hml.vercel.app',
      'https://finca-om0nc4s0p-di3g0-01s-projects.vercel.app', // Custom Vercel domain
      /^https:\/\/.*\.vercel\.app$/, // Allow all Vercel preview URLs
      'https://www.hmfinca.com',
      'https://hmfinca.com',
    ].filter(Boolean) as (string | RegExp)[],
    credentials: true, // Allow cookies
  });

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
