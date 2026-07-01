import { Controller, Get, Post, Body, Param, Put, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('requests')
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  create(@Body() createRequestDto: any, @Request() req) {
    return this.requestsService.create(createRequestDto, req.user.id);
  }

  @Get()
  findAll(@Request() req) {
    if (req.user.role !== 'ADMIN') throw new UnauthorizedException('Solo administradores');
    return this.requestsService.findAll();
  }

  @Put(':id/approve')
  approve(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'ADMIN') throw new UnauthorizedException('Solo administradores');
    return this.requestsService.approve(+id, req.user);
  }

  @Put(':id/reject')
  reject(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'ADMIN') throw new UnauthorizedException('Solo administradores');
    return this.requestsService.reject(+id, req.user.id);
  }
}
