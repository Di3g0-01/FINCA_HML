import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Animal } from './entities/animal.entity';
import { AnimalsService } from './animals.service';
import { AnimalsController } from './animals.controller';
import { LogsModule } from '../logs/logs.module';
import { CloudinaryService } from '../cloudinary.service';
import { AnimalGrowthUseCase } from './application/use-cases/animal-growth.use-case';
import { AnimalPregnancyUseCase } from './application/use-cases/animal-pregnancy.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([Animal]), LogsModule],
  controllers: [AnimalsController],
  providers: [
    AnimalsService,
    CloudinaryService,
    AnimalGrowthUseCase,
    AnimalPregnancyUseCase,
  ],
  exports: [TypeOrmModule, AnimalsService],
})
export class AnimalsModule {}
