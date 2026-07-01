import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Animal } from './entities/animal.entity';
import { AnimalsService } from './animals.service';
import { AnimalsController } from './animals.controller';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Animal]),
    LogsModule
  ],
  controllers: [AnimalsController],
  providers: [AnimalsService],
  exports: [TypeOrmModule, AnimalsService],
})
export class AnimalsModule {}
