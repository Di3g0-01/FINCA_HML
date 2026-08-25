import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalExpense } from './entities/external-expense.entity';
import { CreateExternalExpenseDto } from './dto/create-external-expense.dto';
import { UserRole } from '../users/entities/user.entity';
import { LogsService } from '../logs/logs.service';
import * as fs from 'fs';
import * as path from 'path';

function parseExpenseFileName(fileName: string): { date: string, amount: number, description: string } | null {
  const name = fileName.replace(/\.pdf$/i, '').trim();

  let dateStr = '';
  let rest = '';

  // Try YYYY-MM-DD
  const yyyyMmDdMatch = name.match(/^(\d{4}-\d{2}-\d{2})[_\s]*(.*)$/i);
  if (yyyyMmDdMatch) {
    dateStr = yyyyMmDdMatch[1];
    rest = yyyyMmDdMatch[2];
  } else {
    // Try DD [MES] YYYY
    const ddMesYyyyMatch = name.match(/^(\d{1,2})[_\s]+([a-z]+)(?:[_\s]+(\d{4}))?[_\s]*(.*)$/i);
    if (ddMesYyyyMatch) {
      const day = ddMesYyyyMatch[1].padStart(2, '0');
      const rawMonth = ddMesYyyyMatch[2].toLowerCase();
      
      const monthMap: Record<string, string> = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
        'mayo': '05', 'junio': '06', 'julio': '07', 'jlio': '07', 
        'agosto': '08', 'septiembre': '09', 'setiembre': '09',
        'octubre': '10', 'noviembre': '11', 'diciembre': '12'
      };
      
      const month = monthMap[rawMonth] || '01';
      const year = ddMesYyyyMatch[3] || new Date().getFullYear().toString();
      
      dateStr = `${year}-${month}-${day}`;
      rest = ddMesYyyyMatch[4];
    }
  }

  if (!dateStr) {
    return null; // Not a valid date format
  }

  // Normalize underscores and multiple spaces
  rest = rest.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

  let amount = 0;
  let description = rest;

  // Try to extract amount anywhere in the string if it has Q, or at the start if it doesn't
  let amountMatch = rest.match(/Q\.?\s*([0-9]+(?:[.,][0-9]+)?)\s*(MIL|M|K)?\b/i);
  if (!amountMatch) {
    amountMatch = rest.match(/^([0-9]+(?:[.,][0-9]+)?)\s*(MIL|M|K)?\b/i);
  }

  if (amountMatch) {
    let numericStr = amountMatch[1];
    
    // Normalize decimal and thousands separators
    if (numericStr.includes(',') && numericStr.includes('.')) {
      numericStr = numericStr.replace(/,/g, '');
    } else if (numericStr.includes(',')) {
      if (/,[0-9]{1,2}$/.test(numericStr)) {
        numericStr = numericStr.replace(/,/g, '.');
      } else {
        numericStr = numericStr.replace(/,/g, '');
      }
    }

    let val = parseFloat(numericStr);
    
    const suffix = amountMatch[2]?.toUpperCase();
    if (suffix === 'MIL' || suffix === 'K') {
      val *= 1000;
    } else if (suffix === 'M') {
      val *= 1000000;
    }
    
    if (!isNaN(val)) {
      amount = val;
      description = rest.replace(amountMatch[0], '').replace(/\s+/g, ' ').trim();
      description = description.replace(/^[-_]+/, '').trim();
    }
  }

  if (!description) {
    description = rest || 'Sin descripción';
  }

  return {
    date: dateStr,
    amount,
    description
  };
}

@Injectable()
export class ExternalExpensesService {
  constructor(
    @InjectRepository(ExternalExpense)
    private readonly externalExpenseRepository: Repository<ExternalExpense>,
    private readonly logsService: LogsService,
  ) {}

  // --- STANDARD CRUD ---

  async create(
    createDto: CreateExternalExpenseDto,
    file?: any,
    userRole: UserRole = UserRole.ADMIN,
    username: string = 'SYSTEM',
  ): Promise<ExternalExpense> {
    const defaultCategories = ['Gasolina', 'Sal', 'Insumos', 'Otros'];

    if (!defaultCategories.includes(createDto.category)) {
      const existingCategory = await this.externalExpenseRepository.findOne({
        where: { category: createDto.category }
      });

      if (!existingCategory && userRole !== UserRole.SUPERUSER) {
        throw new ForbiddenException('Solo el SUPERUSER puede agregar nuevas categorías de gastos.');
      }
    }

    const expense = this.externalExpenseRepository.create({
      ...createDto,
      imageUrl: file ? file.filename : null,
    });
    const saved = await this.externalExpenseRepository.save(expense);

    await this.logsService.createLog({
      username,
      action_type: 'GASTO_GENERAL',
      amount: Number(saved.amount),
      details: `Gasto de ${saved.category}: ${saved.description}`,
    });

    return saved;
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

  async remove(id: string, username: string = 'SYSTEM'): Promise<void> {
    const expense = await this.externalExpenseRepository.findOne({
      where: { id },
    });
    if (!expense) {
      throw new NotFoundException(`Gasto general con ID ${id} no encontrado`);
    }

    if (expense.imageUrl) {
      const filePath = path.join(
        process.cwd(),
        'uploads',
        'external-expenses',
        expense.imageUrl,
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await this.externalExpenseRepository.remove(expense);

    await this.logsService.createLog({
      username,
      action_type: 'ELIMINACION',
      details: `Gasto de ${expense.category} por Q${expense.amount} eliminado.`,
    });
  }

  async removeAll(username: string = 'SYSTEM'): Promise<void> {
    const expenses = await this.externalExpenseRepository.find();
    
    // Eliminar archivos físicos
    for (const expense of expenses) {
      if (expense.imageUrl) {
        const filePath = path.join(
          process.cwd(),
          'uploads',
          'external-expenses',
          expense.imageUrl,
        );
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    // Vaciar tabla
    await this.externalExpenseRepository.clear();

    // Log action
    await this.logsService.createLog({
      username,
      action_type: 'ELIMINACION_MASIVA',
      amount: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
      details: `Se eliminaron TODOS los gastos generales (${expenses.length} registros).`,
    });
  }

  async processZipFile(file: any, username: string = 'SYSTEM'): Promise<any> {
    const AdmZip = require('adm-zip');
    let zip;
    try {
      zip = new AdmZip(file.path);
    } catch (err) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw new Error('No se pudo leer el archivo ZIP');
    }
    
    const zipEntries = zip.getEntries();
    
    let processed = 0;
    let errors: string[] = [];

    const uploadDir = path.join(process.cwd(), 'uploads', 'external-expenses');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    for (const zipEntry of zipEntries) {
      if (!zipEntry.isDirectory && zipEntry.entryName.toLowerCase().endsWith('.pdf')) {
        const fileName = path.basename(zipEntry.entryName);
        
        // Esperamos el formato YYYY-MM-DD_Descripcion.pdf o los nuevos formatos
        const parsed = parseExpenseFileName(fileName);
        
        if (parsed) {
          const { date: dateStr, amount, description } = parsed;
          
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const newFileName = `${uniqueSuffix}.pdf`;
          const targetPath = path.join(uploadDir, newFileName);
          
          fs.writeFileSync(targetPath, zipEntry.getData());

          const expense = this.externalExpenseRepository.create({
            category: 'Otros',
            description,
            amount: amount,
            date: dateStr,
            imageUrl: newFileName,
          });
          await this.externalExpenseRepository.save(expense);
          
          await this.logsService.createLog({
            username,
            action_type: 'GASTO_GENERAL',
            amount: amount,
            details: `Gasto importado desde ZIP: ${description}`,
          });
          
          processed++;
        } else {
          errors.push(`Formato inválido en archivo: ${fileName}. Use YYYY-MM-DD_Descripcion.pdf o DD MES YYYY Q[Monto] Descripcion.pdf`);
        }
      }
    }
    
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    return {
      message: `Proceso completado. ${processed} archivos importados.`,
      processed,
      errors
    };
  }
}
