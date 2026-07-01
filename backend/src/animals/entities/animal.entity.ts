import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';

export enum AnimalType {
  VACA = 'VACA',
  TORO = 'TORO',
  CHIVO = 'CHIVO',
  CHIVA = 'CHIVA',
  TORETE = 'TORETE',
  NOVILLA = 'NOVILLA',
  CABALLO = 'CABALLO',
}

export enum AnimalLote {
  GENERAL = 'GENERAL',
  NOVILLA = 'NOVILLA',
}

export enum AnimalStatus {
  ACTIVO = 'ACTIVO',
  VENDIDO = 'VENDIDO',
  MUERTO = 'MUERTO',
}

export enum AnimalOrigin {
  NACIMIENTO = 'NACIMIENTO',
  COMPRA = 'COMPRA',
}

export enum SaleModality {
  LIBRA = 'LIBRA',
  RAZERO = 'RAZERO',
}

@Entity('animals')
export class Animal {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'enum', enum: AnimalType })
  type: AnimalType;

  @Column({ type: 'varchar', length: 1, nullable: true })
  sex: string | null;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  identifier: string; // Ej: 1/26, 2/26 automatizado. O identificador manual en Compras.

  @Column({ type: 'varchar', length: 50, nullable: true })
  color: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nickname: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  breed: string | null;

  @Index()
  @Column({ type: 'varchar', length: 100, default: 'GENERAL' })
  lote: string;

  @Column({ type: 'date', nullable: true })
  birth_date: Date | null;

  @Column({ type: 'float', nullable: true })
  grado: number | null;

  @Column({ type: 'date', nullable: true })
  purchase_date: Date | null;

  @Column({ type: 'float', nullable: true })
  birth_weight: number | null;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  @ManyToOne(() => Animal, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'mother_id' })
  mother: Animal;

  @Index()
  @Column({ type: 'int', nullable: true })
  mother_id: number | null;

  @Column({ type: 'boolean', default: false })
  is_pregnant: boolean;

  @Column({ type: 'float', nullable: true })
  pregnancy_months: number | null;

  @Column({ type: 'date', nullable: true })
  last_calving_date: Date | null;

  @Column({ type: 'date', nullable: true })
  second_last_calving_date: Date | null;

  @Column({ type: 'int', default: 0 })
  total_calvings: number;

  // --- TRANSACCIONES & ESTADOS ---
  @Index()
  @Column({ type: 'enum', enum: AnimalStatus, default: AnimalStatus.ACTIVO })
  status: AnimalStatus;

  @Column({ type: 'enum', enum: AnimalOrigin, default: AnimalOrigin.NACIMIENTO })
  origin: AnimalOrigin;

  // COMPRAS
  @Column({ type: 'float', nullable: true })
  purchase_price: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  seller_name: string | null;

  // VENTAS
  @Column({ type: 'enum', enum: SaleModality, nullable: true })
  sale_modality: SaleModality | null;

  @Column({ type: 'float', nullable: true })
  sale_weight: number | null;

  @Column({ type: 'float', nullable: true })
  sale_price: number | null;

  @Column({ type: 'date', nullable: true })
  sale_date: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  buyer_name: string | null;

  // MUERTES
  @Column({ type: 'date', nullable: true })
  death_date: Date | null;

  @Column({ type: 'text', nullable: true })
  death_reason: string | null;

  @Index()
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
