import { IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExternalExpenseDto {
  @IsString()
  category: string;

  @IsString()
  description: string;

  @Type(() => Number)
  @IsNumber()
  amount: number;

  @IsDateString()
  date: string;
}
