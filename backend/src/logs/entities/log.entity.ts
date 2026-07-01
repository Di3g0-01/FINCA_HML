import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'varchar', length: 150 })
  username: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  action_type: string; // COMPRA, VENTA, MUERTE, NACIMIENTO

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  animal_identifier: string;

  @Column({ type: 'text', nullable: true })
  details: string;

  @Column({ type: 'float', nullable: true })
  amount: number | null;

  @CreateDateColumn()
  created_at: Date;
}
