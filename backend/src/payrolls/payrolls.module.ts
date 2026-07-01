import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollsService } from './payrolls.service';
import { PayrollsController } from './payrolls.controller';
import { Payroll } from './entities/payroll.entity';

import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payroll]), LogsModule],
  controllers: [PayrollsController],
  providers: [PayrollsService]
})
export class PayrollsModule {}
