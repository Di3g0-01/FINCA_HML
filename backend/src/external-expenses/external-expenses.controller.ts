import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  Res,
  Request,
} from '@nestjs/common';
import { ExternalExpensesService } from './external-expenses.service';
import { CreateExternalExpenseDto } from './dto/create-external-expense.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import type { Response } from 'express';
import * as fs from 'fs';

const storage = diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = join(
      process.cwd(),
      'uploads',
      'external-expenses',
    );
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@Controller('external-expenses')
export class ExternalExpensesController {
  constructor(
    private readonly externalExpensesService: ExternalExpensesService,
  ) {}

  // --- STANDARD CRUD ---

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|pdf)$/)) {
          return cb(
            new Error('Solo se permiten imágenes y PDFs (jpg, jpeg, png, gif, pdf)'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  create(
    @Body() createExternalExpenseDto: CreateExternalExpenseDto,
    @UploadedFile() file: any,
    @Request() req: any,
  ) {
    return this.externalExpensesService.create(createExternalExpenseDto, file, req.user?.role);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.externalExpensesService.findAll(startDate, endDate);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.externalExpensesService.remove(id);
  }

  // --- CUSTOM ACTIONS ---

  @Get('uploads/:filename')
  getUploadedFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(
      process.cwd(),
      'uploads',
      'external-expenses',
      filename,
    );
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    return res.status(404).send('Archivo no encontrado');
  }
}
