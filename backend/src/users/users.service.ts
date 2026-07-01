import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async onModuleInit() {
    const adminCount = await this.usersRepository.count();
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
  }

  async create(userData: Partial<User>, adminUsername: string = 'SISTEMA') {
    // Encriptamos la contraseña temporalmente antes de AuthModule puro
    if (userData.password_hash) {
      userData.password_hash = await bcrypt.hash(userData.password_hash, 10);
    }
    const user = this.usersRepository.create(userData);
    const saved = await this.usersRepository.save(user);

    await this.logsService.createLog({
      username: adminUsername,
      action_type: 'USUARIO_CREADO',
      details: `Usuario ${saved.username} creado con rol ${saved.role}.`
    });

    return saved;
  }

  findAll() {
    return this.usersRepository.find();
  }

  findOneByUsername(username: string) {
    return this.usersRepository.findOne({ where: { username } });
  }

  async update(id: number, updateData: Partial<User>, adminUsername: string = 'SISTEMA') {
    const current = await this.usersRepository.findOne({ where: { id } });
    if (!current) return null;

    let changes: string[] = [];
    if (updateData.role && updateData.role !== current.role) changes.push(`Rol: ${current.role} -> ${updateData.role}`);
    if (updateData.password_hash) changes.push(`Contraseña actualizada`);

    if (updateData.password_hash) {
      updateData.password_hash = await bcrypt.hash(updateData.password_hash, 10);
    }
    await this.usersRepository.update(id, updateData);
    const updated = await this.usersRepository.findOne({ where: { id } });

    if (changes.length > 0) {
      await this.logsService.createLog({
        username: adminUsername,
        action_type: 'USUARIO_ACTUALIZADO',
        details: `Usuario ${updated!.username} modificado: ${changes.join(', ')}.`
      });
    }

    return updated!;
  }

  async remove(id: number, adminUsername: string = 'SISTEMA') {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) return null;
    if (user.username === 'admin') {
      throw new Error('No se puede eliminar el usuario administrador principal.');
    }
    const result = await this.usersRepository.delete(id);

    await this.logsService.createLog({
      username: adminUsername,
      action_type: 'USUARIO_ELIMINADO',
      details: `Usuario ${user.username} eliminado permanentemente del sistema.`
    });

    return result;
  }
}
