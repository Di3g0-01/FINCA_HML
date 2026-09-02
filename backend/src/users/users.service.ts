import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private logsService: LogsService,
  ) {}

  // --- LIFECYCLE ---

  async onModuleInit() {
    // Seed admin
    const adminCount = await this.usersRepository.count({
      where: { username: 'admin' },
    });
    if (adminCount === 0) {
      const password_hash = await bcrypt.hash('AdministradorHML', 10);
      const admin = this.usersRepository.create({
        username: 'admin',
        password_hash,
        role: UserRole.ADMIN,
      });
      await this.usersRepository.save(admin);
      console.log('✅ Default root admin user (admin) seeded securely.');
    }

    // Seed superuser
    const superuserCount = await this.usersRepository.count({
      where: { username: 'superuser' },
    });
    const superuserPassword = await bcrypt.hash('SistemasFincaHM2024!', 10);
    if (superuserCount === 0) {
      const superuser = this.usersRepository.create({
        username: 'superuser',
        password_hash: superuserPassword,
        role: UserRole.SUPERUSER,
      });
      await this.usersRepository.save(superuser);
      console.log('✅ Default superuser seeded securely.');
    } else {
      // Siempre sincronizar rol y contraseña del superuser al arrancar
      const su = await this.usersRepository.findOne({
        where: { username: 'superuser' },
      });
      if (su) {
        su.role = UserRole.SUPERUSER;
        su.password_hash = superuserPassword;
        await this.usersRepository.save(su);
        console.log('✅ Superuser role & password synchronized.');
      }
    }
  }

  // --- STANDARD CRUD ---

  async create(
    userData: Partial<User>,
    adminUsername: string = 'SYSTEM',
    adminRole: UserRole = UserRole.ADMIN,
  ) {
    if (adminRole !== UserRole.SUPERUSER) {
      throw new Error('Solo el SUPERUSER puede crear usuarios.');
    }

    if (userData.password_hash) {
      userData.password_hash = await bcrypt.hash(userData.password_hash, 10);
    }

    const user = this.usersRepository.create(userData);
    const saved = await this.usersRepository.save(user);

    await this.logsService.createLog({
      username: adminUsername,
      action_type: 'USUARIO_CREADO',
      details: `Usuario ${saved.username} creado con rol ${saved.role}.`,
    });

    return saved;
  }

  findAll(requesterRole?: UserRole) {
    if (requesterRole !== UserRole.SUPERUSER) {
      return this.usersRepository.find({
        where: { role: Not(UserRole.SUPERUSER) },
      });
    }
    return this.usersRepository.find();
  }

  async update(
    id: number,
    updateData: Partial<User>,
    adminUsername: string = 'SYSTEM',
    adminRole: UserRole = UserRole.ADMIN,
  ) {
    if (adminRole !== UserRole.SUPERUSER) {
      throw new Error('Solo el SUPERUSER puede modificar usuarios.');
    }
    const current = await this.usersRepository.findOne({ where: { id } });

    if (!current) return null;

    const changes: string[] = [];

    if (updateData.role && updateData.role !== current.role) {
      changes.push(`Rol: ${current.role} -> ${updateData.role}`);
    }

    if (updateData.password_hash) {
      changes.push(`Contraseña actualizada`);
      updateData.password_hash = await bcrypt.hash(
        updateData.password_hash,
        10,
      );
    }

    await this.usersRepository.update(id, updateData);

    const updated = await this.usersRepository.findOne({ where: { id } });

    if (changes.length > 0) {
      await this.logsService.createLog({
        username: adminUsername,
        action_type: 'USUARIO_ACTUALIZADO',
        details: `Usuario ${updated!.username} modificado: ${changes.join(', ')}.`,
      });
    }

    return updated!;
  }

  async remove(
    id: number,
    adminUsername: string = 'SYSTEM',
    adminRole: UserRole = UserRole.ADMIN,
  ) {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) return null;

    if (user.username === 'admin') {
      throw new Error(
        'No se puede eliminar el usuario administrador principal.',
      );
    }

    if (adminRole !== UserRole.SUPERUSER) {
      throw new Error('Solo el SUPERUSER puede eliminar usuarios.');
    }

    const result = await this.usersRepository.delete(id);

    await this.logsService.createLog({
      username: adminUsername,
      action_type: 'USUARIO_ELIMINADO',
      details: `Usuario ${user.username} eliminado permanentemente del sistema.`,
    });

    return result;
  }

  // --- CUSTOM ACTIONS ---

  findOneByUsername(username: string) {
    return this.usersRepository.findOne({ where: { username } });
  }
}
