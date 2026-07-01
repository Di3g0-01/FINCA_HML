import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { RequestEntity } from './entities/request.entity';
import { AnimalsModule } from '../animals/animals.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([RequestEntity]), AnimalsModule, LogsModule],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
