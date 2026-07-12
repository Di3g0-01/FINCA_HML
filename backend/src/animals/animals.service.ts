import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Brackets } from 'typeorm';
import { Animal, AnimalType, AnimalStatus, AnimalLote, AnimalOrigin } from './entities/animal.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class AnimalsService implements OnModuleInit {
  private readonly logger = new Logger(AnimalsService.name);

  constructor(
    @InjectRepository(Animal)
    private animalsRepository: Repository<Animal>,
    private logsService: LogsService,
  ) {}

  async onModuleInit() {
    this.logger.log('Boot Sequence: Corriendo Validaciones Cronológicas...');
    await this.handleCalfGrowth();
    await this.updatePregnancies();
  }

  private autoAdjustTypeByAge(animalData: Partial<Animal>) {
    if (!animalData.birth_date) return;
    if (animalData.type === AnimalType.CABALLO) return;

    const birth = new Date(animalData.birth_date);
    const now = new Date();
    const ageInDays = (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24);
    const ageInMonths = ageInDays / 30.4375;

    // Determinar orientación biológica basada en el tipo actual o el sexo enviado
    let isMale = ['TORO', 'TORETE', 'CHIVO', 'DESMADRE_MACHO'].includes(animalData.type as string);
    let isFemale = ['VACA', 'NOVILLA', 'CHIVA', 'DESMADRE_HEMBRA'].includes(animalData.type as string);

    if (animalData.sex === 'M') { isMale = true; isFemale = false; }
    if (animalData.sex === 'H') { isMale = false; isFemale = true; }

    if (isMale) {
      if (ageInMonths <= 6.5) animalData.type = AnimalType.CHIVO;
      else if (ageInMonths < 12) animalData.type = AnimalType.DESMADRE_MACHO;
      else if (ageInMonths < 24) animalData.type = AnimalType.TORETE;
      else animalData.type = AnimalType.TORO;
      animalData.sex = 'M';
    } else if (isFemale) {
      if (ageInMonths <= 6.5) animalData.type = AnimalType.CHIVA;
      else if (ageInMonths < 12) animalData.type = AnimalType.DESMADRE_HEMBRA;
      else if (ageInMonths < 24) animalData.type = AnimalType.NOVILLA;
      else animalData.type = AnimalType.VACA;
      animalData.sex = 'H';
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCalfGrowth() {
    this.logger.log('Iniciando rutina de crecimiento cronológica...');
    const now = new Date();
    const sixHalfMonthsAgo = new Date(now.getTime() - (6.5 * 30.4375 * 24 * 60 * 60 * 1000));
    const oneYearAgo = new Date(now); oneYearAgo.setFullYear(now.getFullYear() - 1);
    const twoYearsAgo = new Date(now); twoYearsAgo.setFullYear(now.getFullYear() - 2);

    try {
      const processEvolutions = async (currentType: AnimalType, newType: AnimalType, dateLimit: Date) => {
        const animals = await this.animalsRepository.find({
          where: { type: currentType, birth_date: LessThanOrEqual(dateLimit) }
        });
        
        for (const animal of animals) {
          animal.type = newType;
          await this.animalsRepository.save(animal);
          await this.logsService.createLog({
            username: 'SISTEMA',
            action_type: 'EVOLUCION',
            animal_identifier: animal.identifier,
            details: `Cambio automático de etapa: de ${currentType} a ${newType}`
          });
        }
        return animals.length;
      };

      const cToDM = await processEvolutions(AnimalType.CHIVO, AnimalType.DESMADRE_MACHO, sixHalfMonthsAgo);
      const dmToT = await processEvolutions(AnimalType.DESMADRE_MACHO, AnimalType.TORETE, oneYearAgo);
      const tToTo = await processEvolutions(AnimalType.TORETE, AnimalType.TORO, twoYearsAgo);

      const cToDH = await processEvolutions(AnimalType.CHIVA, AnimalType.DESMADRE_HEMBRA, sixHalfMonthsAgo);
      const dhToN = await processEvolutions(AnimalType.DESMADRE_HEMBRA, AnimalType.NOVILLA, oneYearAgo);
      const nToV = await processEvolutions(AnimalType.NOVILLA, AnimalType.VACA, twoYearsAgo);

      this.logger.log(`Evoluciones: ${cToDM} Chivo->DesmadreM, ${dmToT} DesmadreM->Torete, ${tToTo} Torete->Toro, ${cToDH} Chiva->DesmadreH, ${dhToN} DesmadreH->Novilla, ${nToV} Novilla->Vaca.`);
    } catch (e) {
      this.logger.error('Error durante la rutina de crecimiento cronológica.', e);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updatePregnancies() {
    this.logger.log('Iniciando rutina de actualización de preñeces...');
    try {
      const pregnantAnimals = await this.animalsRepository.find({
        where: { is_pregnant: true, status: AnimalStatus.ACTIVO }
      });

      const now = new Date();
      for (const animal of pregnantAnimals) {
        if (animal.pregnancy_start_date) {
          const start = new Date(animal.pregnancy_start_date);
          const diffDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
          const months = diffDays / 30.4375;
          
          if (months >= 10.0) {
            animal.pregnancy_months = 10.0;
          } else {
            animal.pregnancy_months = Math.round(months * 10) / 10;
          }
          await this.animalsRepository.save(animal);
        }
      }
    } catch (e) {
      this.logger.error('Error actualizando preñeces:', e);
    }
  }

  async getAlerts() {
    const pregnantList = await this.animalsRepository.createQueryBuilder('animal')
      .where('animal.status = :status', { status: AnimalStatus.ACTIVO })
      .andWhere('animal.is_pregnant = :isPregnant', { isPregnant: true })
      .andWhere('animal.pregnancy_months >= :months', { months: 9 })
      .getMany();
    
    return pregnantList.map(a => ({
      id: a.id,
      identifier: a.identifier,
      pregnancy_months: a.pregnancy_months,
      message: `El animal ${a.identifier} ha alcanzado ${a.pregnancy_months} meses de preñez.`
    }));
  }

  async create(animalData: Partial<Animal>, username: string = 'SISTEMA') {
    if (animalData.type === AnimalType.CABALLO) {
      if (!animalData.nickname) {
        throw new BadRequestException('El nombre es obligatorio para caballos.');
      }
      animalData.identifier = animalData.nickname;
    }

    // 1. Verificación de Duplicados
    if (animalData.identifier) {
      const existing = await this.animalsRepository.findOne({ 
        where: { identifier: animalData.identifier, status: AnimalStatus.ACTIVO } 
      });
      if (existing) {
        throw new BadRequestException(`El animal ${animalData.identifier} ya está registrado.`);
      }
    }

    this.autoAdjustTypeByAge(animalData);

    // Auto-sex logic
    if (animalData.type && [AnimalType.VACA, AnimalType.CHIVA, AnimalType.NOVILLA, AnimalType.DESMADRE_HEMBRA].includes(animalData.type)) {
      animalData.sex = 'H';
    } else if (animalData.type && [AnimalType.TORO, AnimalType.CHIVO, AnimalType.TORETE, AnimalType.DESMADRE_MACHO].includes(animalData.type)) {
      animalData.sex = 'M';
    }
    // Note: CABALLO sex remains selectable.

    // Pregnancy calculations
    if (animalData.is_pregnant && animalData.pregnancy_months) {
      const months = Number(animalData.pregnancy_months);
      const start = new Date();
      start.setDate(start.getDate() - Math.round(months * 30.4375));
      animalData.pregnancy_start_date = start;
    } else {
      animalData.pregnancy_start_date = null;
    }

    // Si no es compra y no tiene identificador manual (y no es caballo), generamos automáticamente.
    if (animalData.type !== AnimalType.CABALLO && animalData.origin !== AnimalOrigin.COMPRA && !animalData.identifier) {
      let yearForId = new Date().getFullYear().toString().slice(-2);
      if (animalData.birth_date) {
        const birthYearFull = new Date(animalData.birth_date).getFullYear();
        if (!isNaN(birthYearFull)) {
          yearForId = birthYearFull.toString().slice(-2);
        }
      }
      
      const animalsThisYear = await this.animalsRepository
        .createQueryBuilder('animal')
        .where('animal.identifier LIKE :suffix', { suffix: `%/${yearForId}` })
        .getMany();
        
      let maxSerial = 0;
      animalsThisYear.forEach(a => {
        if (a.identifier) {
          const parts = a.identifier.split('/');
          if (parts.length === 2 && parts[1] === yearForId) {
            const num = parseInt(parts[0], 10);
            if (!isNaN(num) && num > maxSerial) {
              maxSerial = num;
            }
          }
        }
      });
      
      animalData.identifier = `${maxSerial + 1}/${yearForId}`;
    }

    // Lógica Automática Partos
    if ((animalData.type === 'VACA' || animalData.type === 'CHIVA' || animalData.type === 'TORO' || animalData.type === 'CHIVO') && animalData.mother_id) {
      const mother = await this.animalsRepository.findOne({ where: { id: animalData.mother_id } });
      if (mother) {
        if (mother.type === 'VACA' || mother.type === 'CHIVA') {
          mother.second_last_calving_date = mother.last_calving_date; 
          mother.last_calving_date = animalData.birth_date ? new Date(animalData.birth_date) : new Date();
          mother.is_pregnant = false;
          mother.pregnancy_months = null;
        }
        // Recount offspring to ensure accuracy
        const offspringCount = await this.animalsRepository.count({ where: { mother_id: mother.id } });
        mother.total_calvings = offspringCount + 1; // Existing + this new one
        await this.animalsRepository.save(mother);
      }
    }

    const animal = this.animalsRepository.create(animalData);
    const saved = await this.animalsRepository.save(animal);

    // Record Log
    await this.logsService.createLog({
      username,
      action_type: saved.origin === 'COMPRA' ? 'COMPRA' : 'NACIMIENTO',
      animal_identifier: saved.identifier,
      amount: saved.origin === 'COMPRA' && saved.purchase_price != null ? Number(saved.purchase_price) : undefined,
      details: `${saved.origin === 'COMPRA' ? 'Comprado' : 'Nacido'} - ${saved.type} ${saved.sex || ''} ${saved.color || ''}`.trim()
    });

    return saved;
  }

  async findAll(page?: number, limit?: number, status?: string, search?: string, withCalvings?: boolean, isControlPartos?: boolean, isPregnant?: boolean) {
    const query = this.animalsRepository.createQueryBuilder('animal')
      .leftJoinAndSelect('animal.mother', 'mother');

    if (status === 'VENDIDO') {
      query.orderBy('animal.sale_date', 'DESC')
           .addOrderBy('animal.updated_at', 'DESC');
    } else if (status === 'MUERTO') {
      query.orderBy('animal.death_date', 'DESC')
           .addOrderBy('animal.updated_at', 'DESC');
    } else {
      query.orderBy("CAST(NULLIF(regexp_replace(split_part(animal.identifier, '/', 2), '[^0-9]', '', 'g'), '') AS INTEGER)", 'ASC', 'NULLS LAST')
           .addOrderBy("CAST(NULLIF(regexp_replace(split_part(animal.identifier, '/', 1), '[^0-9]', '', 'g'), '') AS INTEGER)", 'ASC', 'NULLS LAST');
    }

    if (status && status !== 'TODOS') {
      query.andWhere('animal.status = :status', { status });
    }

    if (withCalvings) {
      query.andWhere('animal.type = :type AND animal.total_calvings > 0', { type: AnimalType.VACA });
    }

    if (isControlPartos) {
      if (isPregnant) {
        query.andWhere('animal.is_pregnant = :isPregnant', { isPregnant: true });
      } else {
        query.andWhere(new Brackets(qb => {
          qb.where('animal.is_pregnant = :isPregnant', { isPregnant: true })
            .orWhere('animal.total_calvings > 0');
        }));
      }
      query.andWhere('animal.type IN (:...types)', { types: [AnimalType.VACA, AnimalType.NOVILLA, AnimalType.DESMADRE_HEMBRA, AnimalType.CHIVA] });
    }

    if (search) {
      const exactSearch = search.trim();
      query.andWhere(
        new Brackets(qb => {
          qb.where('animal.identifier = :exactSearch', { exactSearch })
            .orWhere('animal.nickname ILIKE :search', { search: `%${exactSearch}%` })
            .orWhere('mother.identifier = :exactSearch', { exactSearch })
            // Hijos del animal buscado
            .orWhere('animal.mother_id IN (SELECT a.id FROM animals a WHERE a.identifier = :exactSearch)', { exactSearch })
            // Madre del animal buscado
            .orWhere('animal.id IN (SELECT a.mother_id FROM animals a WHERE a.identifier = :exactSearch AND a.mother_id IS NOT NULL)', { exactSearch });
        })
      );
    }

    if (page && limit) {
      const skip = (page - 1) * limit;
      const total = await query.getCount();
      query.offset(skip).limit(limit);

      const data = await query.getMany();
      return { data, total, page, totalPages: Math.ceil(total / limit) };
    }

    const data = await query.getMany();
    return { data, total: data.length, page: 1, totalPages: 1 };
  }

  findOne(id: number) {
    return this.animalsRepository.findOne({ where: { id }, relations: ['mother'] });
  }

  async update(id: number, updateData: Partial<Animal>, username: string = 'SISTEMA') {
    const current = await this.findOne(id);
    if (!current) throw new BadRequestException(`Animal con ID ${id} no encontrado.`);

    // Comparar cambios significativos para el log
    let changes: string[] = [];
    const fieldsToTrack = [
      { key: 'identifier', label: 'ID' },
      { key: 'lote', label: 'Lote' },
      { key: 'color', label: 'Color' },
      { key: 'nickname', label: 'Apodo' },
      { key: 'current_weight', label: 'Peso' },
      { key: 'observations', label: 'Obs.' },
      { key: 'grado', label: 'Grado' }
    ];

    fieldsToTrack.forEach(f => {
      if (updateData[f.key] !== undefined && updateData[f.key] !== current[f.key]) {
        changes.push(`${f.label}: ${current[f.key] || 'N/A'} -> ${updateData[f.key]}`);
      }
    });

    const combined = { ...current, ...updateData };
    this.autoAdjustTypeByAge(combined);
    updateData.type = combined.type;
    updateData.sex = combined.sex;

    if (combined.type === AnimalType.CABALLO) {
      updateData.identifier = updateData.nickname || combined.nickname || undefined;
      if (!updateData.identifier) {
        throw new BadRequestException('El nombre es obligatorio para caballos.');
      }
    }

    if (updateData.is_pregnant !== undefined || updateData.pregnancy_months !== undefined) {
      const isPregnant = updateData.is_pregnant !== undefined ? updateData.is_pregnant : current.is_pregnant;
      const months = updateData.pregnancy_months !== undefined ? updateData.pregnancy_months : current.pregnancy_months;
      
      if (isPregnant && months) {
        if (isPregnant !== current.is_pregnant || months !== current.pregnancy_months || !current.pregnancy_start_date) {
          const start = new Date();
          start.setDate(start.getDate() - Math.round(Number(months) * 30.4375));
          updateData.pregnancy_start_date = start;
        }
      } else {
        updateData.pregnancy_start_date = null;
      }
    }

    if (updateData.mother_id !== undefined && updateData.mother_id !== current.mother_id) {
      changes.push(`Madre cambiada`);
      await this.animalsRepository.manager.transaction(async transactionalEntityManager => {
        if (updateData.mother_id) {
          const newMother = await transactionalEntityManager.findOne(Animal, { where: { id: updateData.mother_id } });
          if (newMother) {
            const offspringCount = await transactionalEntityManager.count(Animal, { where: { mother_id: newMother.id } });
            newMother.total_calvings = offspringCount + 1; 
            await transactionalEntityManager.save(newMother);
          }
        }
        if (current.mother_id) {
          const oldMother = await transactionalEntityManager.findOne(Animal, { where: { id: current.mother_id } });
          if (oldMother) {
            const offspringCount = await transactionalEntityManager.count(Animal, { where: { mother_id: oldMother.id } });
            oldMother.total_calvings = Math.max(0, offspringCount - 1);
            await transactionalEntityManager.save(oldMother);
          }
        }
      });
    }

    await this.animalsRepository.update(id, updateData);
    const updated = await this.findOne(id);

    // Logs de Estatus (Venta/Muerte)
    if (updateData.status && updateData.status !== current.status && updated) {
      if (updateData.status === AnimalStatus.VENDIDO) {
        await this.logsService.createLog({
          username,
          action_type: 'VENTA',
          animal_identifier: updated!.identifier,
          amount: updated!.sale_price != null ? Number(updated!.sale_price) : undefined,
          details: `Vendido a: ${updated!.buyer_name || 'Desconocido'}`
        });
      } else if (updateData.status === AnimalStatus.MUERTO) {
        await this.logsService.createLog({
          username,
          action_type: 'MUERTE',
          animal_identifier: updated!.identifier,
          details: `Causa: ${updated!.death_reason || 'No especificada'}`
        });
      }
    } else if (changes.length > 0) {
      // Log de modificación general si no es venta/muerte
      await this.logsService.createLog({
        username,
        action_type: 'MODIFICACION',
        animal_identifier: updated!.identifier,
        details: `Cambios detectados: ${changes.join(', ')}`
      });
    }

    return updated as any;
  }

  async remove(id: number, username: string = 'SISTEMA') {
    const animal = await this.findOne(id);
    if (!animal) return { deleted: false };
    
    await this.animalsRepository.delete(id);
    
    await this.logsService.createLog({
      username,
      action_type: 'ELIMINACION',
      animal_identifier: animal.identifier,
      details: `Animal ${animal.identifier} (${animal.type}) eliminado permanentemente.`
    });

    return { deleted: true };
  }

  async removeAll(username: string = 'SISTEMA') {
    this.logger.log('Iniciando limpieza total de la base de datos de animales...');
    const queryRunner = this.animalsRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      await queryRunner.query('TRUNCATE TABLE animals CASCADE');
      await queryRunner.commitTransaction();
      this.logger.log('Limpieza completada exitosamente.');
    } catch (e) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      this.logger.error('Error durante la limpieza de la base de datos:', e);
      throw e;
    } finally {
      await queryRunner.release();
    }

    try {
      await this.logsService.createLog({
        username,
        action_type: 'LIMPIEZA_DB',
        details: 'Se ha eliminado la base de datos completa de animales mediante la función de Reiniciar BD.'
      });
    } catch (logErr) {
      this.logger.warn('Limpieza exitosa pero falló la creación del log de auditoría:', logErr);
    }

    return { message: 'Todos los registros de animales han sido eliminados correctamente.' };
  }
}
