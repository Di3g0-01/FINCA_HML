import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payroll } from './entities/payroll.entity';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class PayrollsService {
  constructor(
    @InjectRepository(Payroll)
    private payrollsRepository: Repository<Payroll>,
    private logsService: LogsService,
  ) {}

  async create(data: Partial<Payroll>, username: string = 'SISTEMA') {
    const payroll = this.payrollsRepository.create(data);
    const saved = await this.payrollsRepository.save(payroll);

    await this.logsService.createLog({
      username,
      action_type: 'PAGO_PLANILLA',
      amount: undefined,
      details: `Pago de planilla registrado para el periodo ${saved.period_name}.`
    });

    return saved;
  }

  findAll() {
    return this.payrollsRepository.find({ order: { created_at: 'DESC' } });
  }

  async findOne(id: number) {
    const payroll = await this.payrollsRepository.findOne({ where: { id } });
    if (!payroll) throw new NotFoundException('Planilla no encontrada');
    return payroll;
  }

  async remove(id: number, username: string = 'SISTEMA') {
    const payroll = await this.findOne(id);
    await this.payrollsRepository.delete(id);

    await this.logsService.createLog({
      username,
      action_type: 'PAGO_ELIMINADO',
      details: `Registro de pago ID ${id} eliminado del historial.`
    });

    return { deleted: true };
  }
}
