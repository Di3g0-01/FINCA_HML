import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Brackets } from 'typeorm';
import {
  Animal,
  AnimalType,
  AnimalStatus,
  AnimalLote,
  AnimalOrigin,
} from './entities/animal.entity';
import { LogsService } from '../logs/logs.service';
import { AnimalGrowthUseCase } from './application/use-cases/animal-growth.use-case';
import { AnimalPregnancyUseCase } from './application/use-cases/animal-pregnancy.use-case';
import { AnimalDomainService } from './domain/services/animal-domain.service';

@Injectable()
export class AnimalsService implements OnModuleInit {
  private readonly logger = new Logger(AnimalsService.name);

  constructor(
    @InjectRepository(Animal)
    private animalsRepository: Repository<Animal>,
    private logsService: LogsService,
    private animalGrowthUseCase: AnimalGrowthUseCase,
    private animalPregnancyUseCase: AnimalPregnancyUseCase,
  ) {}

  async onModuleInit() {
    this.logger.log('Boot Sequence: Corriendo Validaciones Cronológicas...');
    await this.animalGrowthUseCase.execute();
    await this.animalPregnancyUseCase.execute();
  }



  // --- STANDARD CRUD ---

  async create(animalData: Partial<Animal>, username: string = 'SYSTEM') {
    if (animalData.type === AnimalType.CABALLO) {
      if (!animalData.nickname) {
        throw new BadRequestException(
          'El nombre es obligatorio para caballos.',
        );
      }
      animalData.identifier = animalData.nickname;
    }

    // 1. Verificación de Duplicados
    if (animalData.identifier) {
      const existing = await this.animalsRepository.findOne({
        where: {
          identifier: animalData.identifier,
          status: AnimalStatus.ACTIVO,
        },
      });
      if (existing) {
        throw new BadRequestException(
          `El animal ${animalData.identifier} ya está registrado.`,
        );
      }
    }

    if (animalData.type) {
      const adjusted = AnimalDomainService.autoAdjustTypeByAge(
        animalData.birth_date ?? null,
        animalData.type,
        animalData.sex ?? null
      );
      animalData.type = adjusted.type;
      animalData.sex = adjusted.sex;
    }

    // Auto-sex logic
    if (
      animalData.type &&
      [
        AnimalType.VACA,
        AnimalType.CHIVA,
        AnimalType.NOVILLA,
        AnimalType.DESMADRE_HEMBRA,
      ].includes(animalData.type)
    ) {
      animalData.sex = 'H';
    } else if (
      animalData.type &&
      [
        AnimalType.TORO,
        AnimalType.CHIVO,
        AnimalType.TORETE,
        AnimalType.DESMADRE_MACHO,
      ].includes(animalData.type)
    ) {
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
    if (
      animalData.type !== AnimalType.CABALLO &&
      animalData.origin !== AnimalOrigin.COMPRA &&
      !animalData.identifier
    ) {
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
      animalsThisYear.forEach((a) => {
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

      const nextSerial = (maxSerial + 1).toString().padStart(2, '0');
      animalData.identifier = `${nextSerial}/${yearForId}`;
    }

    // Lógica Automática Partos
    if (
      (animalData.type === 'VACA' ||
        animalData.type === 'CHIVA' ||
        animalData.type === 'TORO' ||
        animalData.type === 'CHIVO') &&
      animalData.mother_id
    ) {
      const mother = await this.animalsRepository.findOne({
        where: { id: animalData.mother_id },
      });
      if (mother) {
        if (mother.type === 'VACA' || mother.type === 'CHIVA') {
          mother.second_last_calving_date = mother.last_calving_date;
          mother.last_calving_date = animalData.birth_date
            ? new Date(animalData.birth_date)
            : new Date();
          mother.is_pregnant = false;
          mother.pregnancy_months = null;
          mother.pregnancy_start_date = null;
        }
        // Recount offspring to ensure accuracy
        const offspringCount = await this.animalsRepository.count({
          where: { mother_id: mother.id },
        });
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
      amount:
        saved.origin === 'COMPRA' && saved.purchase_price != null
          ? Number(saved.purchase_price)
          : undefined,
      details:
        `${saved.origin === 'COMPRA' ? 'Comprado' : 'Nacido'} - ${saved.type} ${saved.sex || ''} ${saved.color || ''}`.trim(),
    });

    return saved;
  }

  async findAll(
    page?: number,
    limit?: number,
    status?: string,
    search?: string,
    withCalvings?: boolean,
    isControlPartos?: boolean,
    isPregnant?: boolean,
  ) {
    const query = this.animalsRepository
      .createQueryBuilder('animal')
      .leftJoinAndSelect('animal.mother', 'mother');

    if (status === 'VENDIDO') {
      query
        .orderBy('animal.sale_date', 'DESC')
        .addOrderBy('animal.updated_at', 'DESC');
    } else if (status === 'MUERTO') {
      query
        .orderBy('animal.death_date', 'DESC')
        .addOrderBy('animal.updated_at', 'DESC');
    } else {
      query
        .orderBy(
          "CAST(NULLIF(regexp_replace(split_part(animal.identifier, '/', 2), '[^0-9]', '', 'g'), '') AS INTEGER)",
          'ASC',
          'NULLS LAST',
        )
        .addOrderBy(
          "CAST(NULLIF(regexp_replace(split_part(animal.identifier, '/', 1), '[^0-9]', '', 'g'), '') AS INTEGER)",
          'ASC',
          'NULLS LAST',
        );
    }

    if (status && status !== 'TODOS') {
      query.andWhere('animal.status = :status', { status });
    }

    if (withCalvings) {
      query.andWhere('animal.type = :type AND animal.total_calvings > 0', {
        type: AnimalType.VACA,
      });
    }

    if (isControlPartos) {
      if (isPregnant) {
        query.andWhere('animal.is_pregnant = :isPregnant', {
          isPregnant: true,
        });
      } else {
        query.andWhere(
          new Brackets((qb) => {
            qb.where('animal.is_pregnant = :isPregnant', {
              isPregnant: true,
            }).orWhere('animal.total_calvings > 0');
          }),
        );
      }
      query.andWhere('animal.type IN (:...types)', {
        types: [
          AnimalType.VACA,
          AnimalType.NOVILLA,
          AnimalType.DESMADRE_HEMBRA,
          AnimalType.CHIVA,
        ],
      });
    }

    if (search) {
      const exactSearch = search.trim();
      query.andWhere(
        new Brackets((qb) => {
          qb.where('animal.identifier = :exactSearch', { exactSearch })
            .orWhere('animal.nickname ILIKE :search', {
              search: `%${exactSearch}%`,
            })
            .orWhere('mother.identifier = :exactSearch', { exactSearch })
            // Hijos del animal buscado
            .orWhere(
              'animal.mother_id IN (SELECT a.id FROM animals a WHERE a.identifier = :exactSearch)',
              { exactSearch },
            )
            // Madre del animal buscado
            .orWhere(
              'animal.id IN (SELECT a.mother_id FROM animals a WHERE a.identifier = :exactSearch AND a.mother_id IS NOT NULL)',
              { exactSearch },
            );
        }),
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
    return this.animalsRepository.findOne({
      where: { id },
      relations: ['mother'],
    });
  }

  async update(
    id: number,
    updateData: Partial<Animal>,
    username: string = 'SYSTEM',
  ) {
    const current = await this.findOne(id);
    if (!current)
      throw new BadRequestException(`Animal con ID ${id} no encontrado.`);

    // Comparar cambios significativos para el log
    const changes: string[] = [];
    const fieldsToTrack = [
      { key: 'identifier', label: 'ID' },
      { key: 'type', label: 'Tipo' },
      { key: 'sex', label: 'Sexo' },
      { key: 'lote', label: 'Lote' },
      { key: 'color', label: 'Color' },
      { key: 'nickname', label: 'Apodo' },
      { key: 'current_weight', label: 'Peso' },
      { key: 'observations', label: 'Obs.' },
      { key: 'grado', label: 'Grado' },
      { key: 'is_pregnant', label: 'Preñada' },
      { key: 'pregnancy_months', label: 'Meses de preñez' }
    ];

    fieldsToTrack.forEach((f) => {
      if (
        updateData[f.key] !== undefined &&
        updateData[f.key] !== current[f.key]
      ) {
        changes.push(
          `${f.label}: ${current[f.key] || 'N/A'} -> ${updateData[f.key]}`,
        );
      }
    });

    const combined = { ...current, ...updateData };
    if (combined.type) {
      const adjusted = AnimalDomainService.autoAdjustTypeByAge(
        combined.birth_date ?? null,
        combined.type,
        combined.sex ?? null
      );
      updateData.type = adjusted.type;
      updateData.sex = adjusted.sex;
    }

    if (combined.type === AnimalType.CABALLO) {
      updateData.identifier =
        updateData.nickname || combined.nickname || undefined;
      if (!updateData.identifier) {
        throw new BadRequestException(
          'El nombre es obligatorio para caballos.',
        );
      }
    }

    if (
      updateData.is_pregnant !== undefined ||
      updateData.pregnancy_months !== undefined
    ) {
      const isPregnant =
        updateData.is_pregnant !== undefined
          ? updateData.is_pregnant
          : current.is_pregnant;
      const months =
        updateData.pregnancy_months !== undefined
          ? updateData.pregnancy_months
          : current.pregnancy_months;

      if (isPregnant) {
        if (
          !current.is_pregnant ||
          !current.pregnancy_start_date
        ) {
          const start = new Date();
          start.setDate(start.getDate() - Math.round(Number(months || 0) * 30.4375));
          updateData.pregnancy_start_date = start;
        } else if (
          updateData.pregnancy_months !== undefined &&
          Number(updateData.pregnancy_months) !== Number(current.pregnancy_months)
        ) {
          const start = new Date();
          start.setDate(start.getDate() - Math.round(Number(months || 0) * 30.4375));
          updateData.pregnancy_start_date = start;
        } else {
          // Mantener la fecha inicial, no sobreescribir si no hay cambio manual de meses
          delete updateData.pregnancy_start_date;
          delete updateData.pregnancy_months;
        }
      } else {
        updateData.pregnancy_start_date = null;
        updateData.pregnancy_months = null;
      }
    } else {
      delete updateData.pregnancy_start_date;
    }

    if (
      updateData.mother_id !== undefined &&
      updateData.mother_id !== current.mother_id
    ) {
      changes.push(`Madre cambiada`);
      await this.animalsRepository.manager.transaction(
        async (transactionalEntityManager) => {
          if (updateData.mother_id) {
            const newMother = await transactionalEntityManager.findOne(Animal, {
              where: { id: updateData.mother_id },
            });
            if (newMother) {
              const offspringCount = await transactionalEntityManager.count(
                Animal,
                { where: { mother_id: newMother.id } },
              );
              newMother.total_calvings = offspringCount + 1;
              await transactionalEntityManager.save(newMother);
            }
          }
          if (current.mother_id) {
            const oldMother = await transactionalEntityManager.findOne(Animal, {
              where: { id: current.mother_id },
            });
            if (oldMother) {
              const offspringCount = await transactionalEntityManager.count(
                Animal,
                { where: { mother_id: oldMother.id } },
              );
              oldMother.total_calvings = Math.max(0, offspringCount - 1);
              await transactionalEntityManager.save(oldMother);
            }
          }
        },
      );
    }

    await this.animalsRepository.update(id, updateData);
    const updated = await this.findOne(id);

    // Logs de Estatus (Venta/Muerte)
    if (updateData.status && updateData.status !== current.status && updated) {
      if (updateData.status === AnimalStatus.VENDIDO) {
        await this.logsService.createLog({
          username,
          action_type: 'VENTA',
          animal_identifier: updated.identifier,
          amount:
            updated.sale_price != null ? Number(updated.sale_price) : undefined,
          details: `Vendido a: ${updated.buyer_name || 'Desconocido'}`,
        });
      } else if (updateData.status === AnimalStatus.MUERTO) {
        await this.logsService.createLog({
          username,
          action_type: 'MUERTE',
          animal_identifier: updated.identifier,
          details: `Causa: ${updated.death_reason || 'No especificada'}`,
        });
      }
    } else if (changes.length > 0) {
      // Log de modificación general si no es venta/muerte
      await this.logsService.createLog({
        username,
        action_type: 'MODIFICACION',
        animal_identifier: updated!.identifier,
        details: `Cambios detectados: ${changes.join(', ')}`,
      });
    }

    return updated as any;
  }

  async remove(id: number, username: string = 'SYSTEM') {
    const animal = await this.findOne(id);
    if (!animal) return { deleted: false };

    await this.animalsRepository.delete(id);

    await this.logsService.createLog({
      username,
      action_type: 'ELIMINACION',
      animal_identifier: animal.identifier,
      details: `Animal ${animal.identifier} (${animal.type}) eliminado permanentemente.`,
    });

    return { deleted: true };
  }

  // --- CUSTOM ACTIONS ---

  async getAlerts() {
    const pregnantList = await this.animalsRepository.find({
      where: { status: AnimalStatus.ACTIVO, is_pregnant: true },
    });

    const now = new Date();
    const alerts: any[] = [];

    for (const a of pregnantList) {
      if (a.pregnancy_start_date) {
        const start = new Date(a.pregnancy_start_date);
        const diffDays =
          (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        let months = diffDays / 30.4375;
        months = Math.round(months * 10) / 10;

        if (months >= 9.0) {
          const finalMonths = months > 10.0 ? 10.0 : months;
          alerts.push({
            id: a.id,
            identifier: a.identifier,
            pregnancy_months: finalMonths,
            message: `El animal ${a.identifier} ha alcanzado ${finalMonths} meses de preñez.`,
          });
        }
      }
    }
    return alerts;
  }

  async removeAll(username: string = 'SYSTEM') {
    this.logger.log(
      'Iniciando limpieza total de la base de datos de animales...',
    );
    const queryRunner =
      this.animalsRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query('TRUNCATE TABLE animals CASCADE');
      await queryRunner.commitTransaction();
      this.logger.log('Limpieza completada exitosamente.');
    } catch (e) {
      if (queryRunner.isTransactionActive)
        await queryRunner.rollbackTransaction();
      this.logger.error('Error durante la limpieza de la base de datos:', e);
      throw e;
    } finally {
      await queryRunner.release();
    }

    try {
      await this.logsService.createLog({
        username,
        action_type: 'LIMPIEZA_DB',
        details:
          'Se ha eliminado la base de datos completa de animales mediante la función de Reiniciar BD.',
      });
    } catch (logErr) {
      this.logger.warn(
        'Limpieza exitosa pero falló la creación del log de auditoría:',
        logErr,
      );
    }

    return {
      message:
        'Todos los registros de animales han sido eliminados correctamente.',
    };
  }
}
