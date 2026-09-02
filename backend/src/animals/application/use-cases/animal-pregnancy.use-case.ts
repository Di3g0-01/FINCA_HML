import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Animal, AnimalStatus } from '../../entities/animal.entity';
import { AnimalDomainService } from '../../domain/services/animal-domain.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AnimalPregnancyUseCase {
  private readonly logger = new Logger(AnimalPregnancyUseCase.name);

  constructor(
    @InjectRepository(Animal)
    private animalsRepository: Repository<Animal>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async execute() {
    this.logger.log(
      'Iniciando rutina de actualización de preñeces (UseCase)...',
    );
    try {
      const pregnantAnimals = await this.animalsRepository.find({
        where: { is_pregnant: true, status: AnimalStatus.ACTIVO },
      });

      const animalsToSave: Animal[] = [];
      for (const animal of pregnantAnimals) {
        if (animal.pregnancy_start_date) {
          const newMonths = AnimalDomainService.calculatePregnancyMonths(
            animal.pregnancy_start_date,
          );
          if (newMonths !== null && animal.pregnancy_months !== newMonths) {
            animal.pregnancy_months = newMonths;
            animalsToSave.push(animal);
          }
        }
      }

      if (animalsToSave.length > 0) {
        await this.animalsRepository.save(animalsToSave);
      }
    } catch (e) {
      this.logger.error('Error actualizando preñeces:', e);
    }
  }
}
