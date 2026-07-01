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

  async findAll(query: { startDate?: string; endDate?: string }) {
    console.log('Querying logs with:', query);
    const qb = this.logsRepository.createQueryBuilder('log')
      .orderBy('log.created_at', 'DESC');

    if (query.startDate && query.endDate) {
      qb.andWhere('DATE(log.created_at) >= :startDate AND DATE(log.created_at) <= :endDate', { 
        startDate: query.startDate, 
        endDate: query.endDate 
      });
    } else if (query.startDate) {
      qb.andWhere('DATE(log.created_at) = :startDate', { startDate: query.startDate });
    }

    const results = await qb.getMany();
    console.log(`Found ${results.length} results.`);
    return results;
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
