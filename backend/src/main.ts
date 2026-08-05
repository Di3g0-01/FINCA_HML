import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security middlewares
  app.use(helmet());
  app.use(cookieParser());
  
  // CORS configuration
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL, 
      'http://localhost:5173', 
      'http://localhost:5174',
      'https://finca-hml.vercel.app'
    ].filter(Boolean) as string[],
    credentials: true, // Allow cookies
  });

  // Global Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
