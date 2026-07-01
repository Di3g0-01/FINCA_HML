import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Worker } from './entities/worker.entity';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class WorkersService {
  constructor(
    @InjectRepository(Worker)
    private workersRepository: Repository<Worker>,
    private logsService: LogsService,
  ) { }

  async create(createWorkerDto: Partial<Worker>, username: string = 'SISTEMA') {
    const worker = this.workersRepository.create(createWorkerDto);
    const saved = await this.workersRepository.save(worker);

    await this.logsService.createLog({
      username,
      action_type: 'TRABAJADOR_CREADO',
      details: `Trabajador ${saved.name} registrado en el sistema.`
    });

    return saved;
  }

  findAll() {
    return this.workersRepository.find({
      order: {
        created_at: 'DESC'
      }
    });
  }

  async findOne(id: number) {
    const worker = await this.workersRepository.findOne({ where: { id } });
    if (!worker) throw new NotFoundException('Trabajador no encontrado');
    return worker;
  }

  async update(id: number, updateWorkerDto: Partial<Worker>, username: string = 'SISTEMA') {
    const current = await this.findOne(id);
    
    let changes: string[] = [];
    if (updateWorkerDto.name && updateWorkerDto.name !== current.name) changes.push(`Nombre: ${current.name} -> ${updateWorkerDto.name}`);
    if (updateWorkerDto.position && updateWorkerDto.position !== current.position) changes.push(`Puesto: ${current.position} -> ${updateWorkerDto.position}`);
    if (updateWorkerDto.salary && updateWorkerDto.salary !== current.salary) changes.push(`Tarifa: ${current.salary} -> ${updateWorkerDto.salary}`);

    await this.workersRepository.update(id, updateWorkerDto);
    const updated = await this.findOne(id);

    if (changes.length > 0) {
      await this.logsService.createLog({
        username,
        action_type: 'TRABAJADOR_ACTUALIZADO',
        details: `Trabajador ${updated.name} modificado: ${changes.join(', ')}.`
      });
    }

    return updated as any;
  }

  async remove(id: number, username: string = 'SISTEMA') {
    const worker = await this.findOne(id);
    await this.workersRepository.delete(id);

    await this.logsService.createLog({
      username,
      action_type: 'TRABAJADOR_ELIMINADO',
      details: `Trabajador ${worker.name} eliminado permanentemente.`
    });

    return { deleted: true };
  }
}
