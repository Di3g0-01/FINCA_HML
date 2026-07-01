import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Animal } from './animals/entities/animal.entity';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';
import { AnimalsModule } from './animals/animals.module';
import { AuthModule } from './auth/auth.module';
import { ScheduleModule } from '@nestjs/schedule';
import { WorkersModule } from './workers/workers.module';
import { Worker } from './workers/entities/worker.entity';
import { PayrollsModule } from './payrolls/payrolls.module';
import { Payroll } from './payrolls/entities/payroll.entity';
import { LogsModule } from './logs/logs.module';
import { ActivityLog } from './logs/entities/log.entity';
import { RequestsModule } from './requests/requests.module';
import { RequestEntity } from './requests/entities/request.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot(
      process.env.DATABASE_URL
        ? {
            type: 'postgres',
            url: process.env.DATABASE_URL,
            entities: [Animal, User, Worker, Payroll, ActivityLog, RequestEntity],
            synchronize: true, // Activa la sincronización automática de tablas para desarrollo
          }
        : {
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            username: process.env.DB_USERNAME || 'admin',
            password: process.env.DB_PASSWORD || 'admin_password',
            database: process.env.DB_DATABASE || 'finca_hml',
            entities: [Animal, User, Worker, Payroll, ActivityLog, RequestEntity],
            synchronize: true, // Activa la sincronización automática de tablas para desarrollo
          }
    ),
    UsersModule,
    AnimalsModule,
    AuthModule,
    WorkersModule,
    PayrollsModule,
    LogsModule,
    RequestsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
