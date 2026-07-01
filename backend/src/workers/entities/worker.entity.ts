import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ContractType {
  FIJO = 'FIJO',
  TEMPORAL = 'TEMPORAL',
}

@Entity('workers')
export class Worker {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  position: string;

  @Column({ type: 'float', nullable: true })
  salary: number | null;

  @Column({ type: 'enum', enum: ContractType, default: ContractType.FIJO })
  contract_type: ContractType;

  @Index()
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Index()
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
