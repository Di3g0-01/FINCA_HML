import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Animal,
  AnimalType,
  AnimalStatus,
  AnimalOrigin,
} from './animals/entities/animal.entity';
import { Repository } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const animalRepo = app.get<Repository<Animal>>(getRepositoryToken(Animal));

  const animalsToInsert = [
    {
      type: AnimalType.CHIVO,
      sex: 'M',
      identifier: 'TEST-CHIVO-1',
      birth_date: new Date('2026-02-28'),
      status: AnimalStatus.ACTIVO,
      origin: AnimalOrigin.NACIMIENTO,
      lote: 'GENERAL',
    },
    {
      type: AnimalType.DESMADRE_MACHO,
      sex: 'M',
      identifier: 'TEST-DMACHO-1',
      birth_date: new Date('2025-09-28'),
      status: AnimalStatus.ACTIVO,
      origin: AnimalOrigin.NACIMIENTO,
      lote: 'GENERAL',
    },
    {
      type: AnimalType.TORETE,
      sex: 'M',
      identifier: 'TEST-TORETE-1',
      birth_date: new Date('2024-09-28'),
      status: AnimalStatus.ACTIVO,
      origin: AnimalOrigin.NACIMIENTO,
      lote: 'GENERAL',
    },
    {
      type: AnimalType.CHIVA,
      sex: 'H',
      identifier: 'TEST-CHIVA-1',
      birth_date: new Date('2026-02-28'),
      status: AnimalStatus.ACTIVO,
      origin: AnimalOrigin.NACIMIENTO,
      lote: 'GENERAL',
    },
    {
      type: AnimalType.DESMADRE_HEMBRA,
      sex: 'H',
      identifier: 'TEST-DHEMBRA-1',
      birth_date: new Date('2025-09-28'),
      status: AnimalStatus.ACTIVO,
      origin: AnimalOrigin.NACIMIENTO,
      lote: 'GENERAL',
    },
    {
      type: AnimalType.NOVILLA,
      sex: 'H',
      identifier: 'TEST-NOVILLA-1',
      birth_date: new Date('2024-09-28'),
      status: AnimalStatus.ACTIVO,
      origin: AnimalOrigin.NACIMIENTO,
      lote: 'GENERAL',
    },
  ];

  for (const data of animalsToInsert) {
    const animal = animalRepo.create(data);
    await animalRepo.save(animal);
    console.log(`Inserted ${data.type}`);
  }

  await app.close();
}

bootstrap();
