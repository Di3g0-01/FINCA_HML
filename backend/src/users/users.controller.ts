import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Patch,
  Param,
  Delete,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // --- STANDARD CRUD ---

  @Post()
  create(@Body() createData: Partial<User>, @Request() req) {
    return this.usersService.create(createData, req.user?.username, req.user?.role);
  }

  @Get()
  findAll(@Request() req) {
    return this.usersService.findAll(req.user?.role);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateData: Partial<User>,
    @Request() req,
  ) {
    return this.usersService.update(+id, updateData, req.user?.username, req.user?.role);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.usersService.remove(+id, req.user?.username, req.user?.role);
  }

  // --- CUSTOM ACTIONS ---
}
