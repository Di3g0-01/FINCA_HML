import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Animal, AnimalType } from '../../entities/animal.entity';
import { LogsService } from '../../../logs/logs.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AnimalGrowthUseCase {
  private readonly logger = new Logger(AnimalGrowthUseCase.name);

  constructor(
    @InjectRepository(Animal)
    private animalsRepository: Repository<Animal>,
    private logsService: LogsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async execute() {
    this.logger.log('Iniciando rutina de crecimiento cronológica (UseCase)...');
    const now = new Date();
    const sixHalfMonthsAgo = new Date(now);
    sixHalfMonthsAgo.setMonth(now.getMonth() - 6);
    sixHalfMonthsAgo.setDate(now.getDate() - 15);
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    const twoYearsAgo = new Date(now);
    twoYearsAgo.setFullYear(now.getFullYear() - 2);

    try {
      const processEvolutions = async (
        currentType: AnimalType,
        newType: AnimalType,
        dateLimit: Date,
      ) => {
        const animals = await this.animalsRepository.find({
          where: { type: currentType, birth_date: LessThanOrEqual(dateLimit) },
        });

        if (animals.length === 0) return 0;

        const animalIds = animals.map(a => a.id);
        await this.animalsRepository.update(animalIds, { type: newType });

        const logPromises = animals.map(animal => 
          this.logsService.createLog({
            username: 'SYSTEM',
            action_type: 'EVOLUCION',
            animal_identifier: animal.identifier,
            details: `Cambio automático de etapa: de ${currentType} a ${newType}`,
          })
        );
        await Promise.all(logPromises);

        return animals.length;
      };

      const cToDM = await processEvolutions(AnimalType.CHIVO, AnimalType.DESMADRE_MACHO, sixHalfMonthsAgo);
      const dmToT = await processEvolutions(AnimalType.DESMADRE_MACHO, AnimalType.TORETE, oneYearAgo);
      const tToTo = await processEvolutions(AnimalType.TORETE, AnimalType.TORO, twoYearsAgo);

      const cToDH = await processEvolutions(AnimalType.CHIVA, AnimalType.DESMADRE_HEMBRA, sixHalfMonthsAgo);
      const dhToN = await processEvolutions(AnimalType.DESMADRE_HEMBRA, AnimalType.NOVILLA, oneYearAgo);
      const nToV = await processEvolutions(AnimalType.NOVILLA, AnimalType.VACA, twoYearsAgo);

      this.logger.log(
        `Evoluciones: ${cToDM} Chivo->DesmadreM, ${dmToT} DesmadreM->Torete, ${tToTo} Torete->Toro, ${cToDH} Chiva->DesmadreH, ${dhToN} DesmadreH->Novilla, ${nToV} Novilla->Vaca.`,
      );
    } catch (e) {
      this.logger.error('Error durante la rutina de crecimiento cronológica.', e);
    }
  }
}
