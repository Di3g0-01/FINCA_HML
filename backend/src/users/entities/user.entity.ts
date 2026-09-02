import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum UserRole {
  SUPERUSER = 'SUPERUSER',
  ADMIN = 'ADMIN',
  OPERADOR = 'OPERADOR',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password_hash: string;

  @Index()
  @Column({ type: 'enum', enum: UserRole, default: UserRole.OPERADOR })
  role: UserRole;

  @CreateDateColumn()
  created_at: Date;
}
