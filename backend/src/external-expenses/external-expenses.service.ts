import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalExpense } from './entities/external-expense.entity';
import { CreateExternalExpenseDto } from './dto/create-external-expense.dto';
import { UserRole } from '../users/entities/user.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ExternalExpensesService {
  constructor(
    @InjectRepository(ExternalExpense)
    private readonly externalExpenseRepository: Repository<ExternalExpense>,
  ) {}

  // --- STANDARD CRUD ---

  async create(
    createDto: CreateExternalExpenseDto,
    file?: any,
    userRole: UserRole = UserRole.ADMIN,
  ): Promise<ExternalExpense> {
    const existingCategory = await this.externalExpenseRepository.findOne({
      where: { category: createDto.category }
    });

    if (!existingCategory && userRole !== UserRole.SUPERUSER) {
      throw new ForbiddenException('Solo el SUPERUSER puede agregar nuevas categorías de gastos.');
    }

    const expense = this.externalExpenseRepository.create({
      ...createDto,
      imageUrl: file ? file.filename : null,
    });
    return await this.externalExpenseRepository.save(expense);
  }

  async findAll(
    startDate?: string,
    endDate?: string,
  ): Promise<ExternalExpense[]> {
    const query = this.externalExpenseRepository.createQueryBuilder('expense');

    if (startDate && endDate) {
      query.where('expense.date >= :startDate AND expense.date <= :endDate', {
        startDate,
        endDate,
      });
    }

    query.orderBy('expense.date', 'DESC');
    return await query.getMany();
  }

  async remove(id: string): Promise<void> {
    const expense = await this.externalExpenseRepository.findOne({
      where: { id },
    });
    if (!expense) {
      throw new NotFoundException(`Gasto externo con ID ${id} no encontrado`);
    }

    if (expense.imageUrl) {
      const filePath = path.join(
        __dirname,
        '..',
        '..',
        '..',
        'uploads',
        'external-expenses',
        expense.imageUrl,
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await this.externalExpenseRepository.remove(expense);
  }
}
