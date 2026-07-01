import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { AnimalsService } from './animals.service';
import { Animal } from './entities/animal.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('animals')
export class AnimalsController {
  constructor(private readonly animalsService: AnimalsService) {}

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
    return this.animalsService.findAll(pageNum, limitNum, status, search, calvingsBool, controlPartosBool, pregnantBool);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.animalsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateData: Partial<Animal>, @Request() req) {
    return this.animalsService.update(+id, updateData, req.user?.username);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.animalsService.remove(+id, req.user?.username);
  }

  @Delete()
  removeAll(@Request() req) {
    return this.animalsService.removeAll(req.user?.username);
  }
}
