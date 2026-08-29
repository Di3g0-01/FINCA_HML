import { AnimalType } from '../../entities/animal.entity';

export class AnimalDomainService {
  /**
   * Determina el tipo y sexo del animal basado en su edad y tipo actual.
   * Pura lógica de negocio, sin dependencias externas.
   */
  static autoAdjustTypeByAge(
    birthDate: Date | null,
    currentType: AnimalType,
    currentSex: string | null,
  ): { type: AnimalType; sex: string | null } {
    if (!birthDate) return { type: currentType, sex: currentSex };
    if (currentType === AnimalType.CABALLO) return { type: currentType, sex: currentSex };

    const birth = new Date(birthDate);
    const now = new Date();
    const ageInDays = (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24);
    const ageInMonths = ageInDays / 30.4375;

    let isMale = ['TORO', 'TORETE', 'CHIVO', 'DESMADRE_MACHO'].includes(currentType as string);
    let isFemale = ['VACA', 'NOVILLA', 'CHIVA', 'DESMADRE_HEMBRA'].includes(currentType as string);

    if (currentSex === 'M') {
      isMale = true;
      isFemale = false;
    }
    if (currentSex === 'H') {
      isMale = false;
      isFemale = true;
    }

    let newType = currentType;
    let newSex = currentSex;

    if (isMale) {
      if (ageInMonths <= 6.5) newType = AnimalType.CHIVO;
      else if (ageInMonths < 12) newType = AnimalType.DESMADRE_MACHO;
      else if (ageInMonths < 24) newType = AnimalType.TORETE;
      else newType = AnimalType.TORO;
      newSex = 'M';
    } else if (isFemale) {
      if (ageInMonths <= 6.5) newType = AnimalType.CHIVA;
      else if (ageInMonths < 12) newType = AnimalType.DESMADRE_HEMBRA;
      else if (ageInMonths < 24) newType = AnimalType.NOVILLA;
      else newType = AnimalType.VACA;
      newSex = 'H';
    }

    return { type: newType, sex: newSex };
  }

  static calculatePregnancyMonths(pregnancyStartDate: Date | null): number | null {
    if (!pregnancyStartDate) return null;
    const now = new Date();
    const start = new Date(pregnancyStartDate);
    const diffDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const months = diffDays / 30.4375;
    return months >= 10.0 ? 10.0 : Math.round(months * 10) / 10;
  }

  static calculatePregnancyStartDate(months: number): Date {
    const start = new Date();
    start.setDate(start.getDate() - Math.round(months * 30.4375));
    return start;
  }
}
