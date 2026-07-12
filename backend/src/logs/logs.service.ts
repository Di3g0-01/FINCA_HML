import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ActivityLog } from './entities/log.entity';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(ActivityLog)
    private logsRepository: Repository<ActivityLog>,
  ) {}

  async createLog(data: {
    username: string;
    action_type: string;
    animal_identifier?: string;
    details?: string;
    amount?: number;
  }) {
    const log = this.logsRepository.create({
      ...data,
      created_at: new Date(),
    });
    return this.logsRepository.save(log);
  }

  async findAll(query: { startDate?: string; endDate?: string; page?: number; limit?: number; actionType?: string }) {
    console.log('Querying logs with:', query);
    const qb = this.logsRepository.createQueryBuilder('log')
      .orderBy('log.created_at', 'DESC');

    if (query.startDate && query.endDate) {
      qb.andWhere("DATE(log.created_at) >= :startDate AND DATE(log.created_at) <= :endDate", { 
        startDate: query.startDate, 
        endDate: query.endDate 
      });
    } else if (query.startDate) {
      qb.andWhere("DATE(log.created_at) = :startDate", { startDate: query.startDate });
    }

    if (query.actionType) {
      qb.andWhere("log.action_type = :actionType", { actionType: query.actionType });
    }

    if (query.page && query.limit) {
      const skip = (query.page - 1) * query.limit;
      const total = await qb.getCount();
      qb.offset(skip).limit(query.limit);

      const data = await qb.getMany();
      return { data, total, page: query.page, totalPages: Math.ceil(total / query.limit) };
    }

    const data = await qb.getMany();
    console.log(`Found ${data.length} results.`);
    return { data, total: data.length, page: 1, totalPages: 1 };
  }

  async remove(id: number) {
    return this.logsRepository.delete(id);
  }

  async cleanupOldLogs() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const logsToDelete = await this.logsRepository.createQueryBuilder('log')
      .where('log.created_at < :sixMonthsAgo', { sixMonthsAgo })
      .getMany();

    if (logsToDelete.length > 0) {
      await this.logsRepository.remove(logsToDelete);
    }

    return { deletedCount: logsToDelete.length };
  }

  async clearAll() {
    return this.logsRepository.clear();
  }
}
