import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
  }

  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Otorga acceso a localhost frontend

  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
