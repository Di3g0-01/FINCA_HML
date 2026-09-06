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

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password_hash: string;

  @Index()
  @Column({ type: 'enum', enum: UserRole, default: UserRole.OPERADOR })
  role: UserRole;

  @Column({ default: false })
  is_verified: boolean;

  @Column({ nullable: true })
  verification_token: string;

  @Column({ nullable: true })
  reset_password_token: string;

  @Column({ type: 'timestamp', nullable: true })
  reset_password_expires: Date;

  @CreateDateColumn()
  created_at: Date;
}
