import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { PayrollsService } from './payrolls.service';
import { Payroll } from './entities/payroll.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('payrolls')
export class PayrollsController {
  constructor(private readonly payrollsService: PayrollsService) {}

  @Post()
  create(@Body() data: Partial<Payroll>, @Request() req) {
    return this.payrollsService.create(data, req.user?.username);
  }

  @Get()
  findAll() {
    return this.payrollsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.payrollsService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.payrollsService.remove(+id, req.user?.username);
  }
}
