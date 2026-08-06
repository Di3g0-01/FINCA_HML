import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AnimalsService } from './animals.service';
import { Animal } from './entities/animal.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('animals')
export class AnimalsController {
  constructor(private readonly animalsService: AnimalsService) {}

  // --- STANDARD CRUD ---

  @Post()
  create(@Body() createData: Partial<Animal>, @Request() req) {
    return this.animalsService.create(createData, req.user?.username);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('withCalvings') withCalvings?: string,
    @Query('isControlPartos') isControlPartos?: string,
    @Query('isPregnant') isPregnant?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const calvingsBool = String(withCalvings) === 'true';
    const controlPartosBool = String(isControlPartos) === 'true';
    const pregnantBool = String(isPregnant) === 'true';
    return this.animalsService.findAll(
      pageNum,
      limitNum,
      status,
      search,
      calvingsBool,
      controlPartosBool,
      pregnantBool,
    );
  }

  // --- CUSTOM ACTIONS ---

  @Get('alerts')
  getAlerts() {
    return this.animalsService.getAlerts();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.animalsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateData: Partial<Animal>,
    @Request() req,
  ) {
    return this.animalsService.update(+id, updateData, req.user?.username);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.animalsService.remove(+id, req.user?.username);
  }

  @Post('upload-document')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten archivos PDF.'), false);
        }
      },
    }),
  )
  uploadDocument(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No se subió ningún archivo.');
    }
    return { path: `/uploads/${file.filename}` };
  }

  @Delete()
  @Roles(UserRole.SUPERUSER)
  @UseGuards(RolesGuard)
  removeAll(@Request() req) {
    return this.animalsService.removeAll(req.user?.username);
  }
}
