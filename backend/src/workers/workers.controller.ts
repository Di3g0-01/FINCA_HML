import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { Worker } from './entities/worker.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Post()
  create(@Body() createWorkerDto: Partial<Worker>, @Request() req) {
    return this.workersService.create(createWorkerDto, req.user?.username);
  }

  @Get()
  findAll() {
    return this.workersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWorkerDto: Partial<Worker>, @Request() req) {
    return this.workersService.update(+id, updateWorkerDto, req.user?.username);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.workersService.remove(+id, req.user?.username);
  }
}
