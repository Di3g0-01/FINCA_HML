import { Controller, Get, Query, UseGuards, Delete, Param } from '@nestjs/common';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('actionType') actionType?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.logsService.findAll({ startDate, endDate, page: pageNum, limit: limitNum, actionType });
  }

  @Delete('cleanup')
  cleanup() {
    return this.logsService.cleanupOldLogs();
  }

  @Delete()
  clearAll() {
    return this.logsService.clearAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.logsService.remove(+id);
  }
}
