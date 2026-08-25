import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalExpensesService } from './external-expenses.service';
import { ExternalExpensesController } from './external-expenses.controller';
import { ExternalExpense } from './entities/external-expense.entity';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([ExternalExpense]), LogsModule],
  controllers: [ExternalExpensesController],
  providers: [ExternalExpensesService],
})
export class ExternalExpensesModule {}
