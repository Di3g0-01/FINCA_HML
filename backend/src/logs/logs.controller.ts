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
  ) {
    return this.logsService.findAll({ startDate, endDate });
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
