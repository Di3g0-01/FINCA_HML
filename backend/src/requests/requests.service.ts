import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestEntity, RequestStatus } from './entities/request.entity';
import { AnimalsService } from '../animals/animals.service';
import { LogsService } from '../logs/logs.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(RequestEntity)
    private requestsRepository: Repository<RequestEntity>,
    private animalsService: AnimalsService,
    private logsService: LogsService,
  ) {}

  async create(createRequestDto: any, userId: number) {
    const request = this.requestsRepository.create({
      type: createRequestDto.type,
      payload: createRequestDto.payload,
      requester_id: userId,
      status: RequestStatus.PENDIENTE
    });
    return this.requestsRepository.save(request);
  }

  async findAll() {
    return this.requestsRepository.find({
      relations: ['requester', 'approver'],
      order: { created_at: 'DESC' }
    });
  }

  async approve(id: number, approverUser: User) {
    const request = await this.requestsRepository.findOne({ where: { id }, relations: ['requester'] });
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    if (request.status !== RequestStatus.PENDIENTE) throw new BadRequestException('La solicitud ya fue procesada');

    // Procesar la solicitud
    try {
      if (request.type === 'NACIMIENTO') {
        const payload = request.payload;
        const savedAnimal = await this.animalsService.create(payload, approverUser.username);
        
        await this.logsService.createLog({
          username: approverUser.username,
          action_type: 'APROBAR_NACIMIENTO',
          details: `Nacimiento aprobado. Solicitado por: ${request.requester?.username || 'Sistema'}`,
          animal_identifier: savedAnimal.identifier
        });
      } else if (request.type === 'MUERTE') {
        const payload = request.payload;
        await this.animalsService.update(payload.animal_id, payload, approverUser.username);
        
        await this.logsService.createLog({
          username: approverUser.username,
          action_type: 'APROBAR_MUERTE',
          details: `Muerte aprobada (Animal ID: ${payload.animal_id}). Solicitado por: ${request.requester?.username || 'Sistema'}`,
          animal_identifier: payload.animal_id?.toString()
        });
      }
      
      request.status = RequestStatus.ACEPTADA;
      request.approver_id = approverUser.id;
      return this.requestsRepository.save(request);
    } catch (e) {
      console.error('Error in approve request:', e);
      throw new BadRequestException('Error al procesar la solicitud en el inventario');
    }
  }

  async reject(id: number, approverId: number) {
    const request = await this.requestsRepository.findOne({ 
      where: { id }, 
      relations: ['requester'] 
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    if (request.status !== RequestStatus.PENDIENTE) throw new BadRequestException('La solicitud ya fue procesada');

    request.status = RequestStatus.RECHAZADA;
    request.approver_id = approverId;
    const saved = await this.requestsRepository.save(request);

    // Obtener información del aprobador para la bitácora
    const approver = await this.requestsRepository.manager.findOne(User, { where: { id: approverId } });
    await this.logsService.createLog({
      username: approver?.username || 'SISTEMA',
      action_type: 'RECHAZAR_SOLICITUD',
      details: `Solicitud de ${request.type} rechazada. Solicitado por: ${request.requester?.username || 'Sistema'}`,
      animal_identifier: request.payload?.identifier || request.payload?.animal_id?.toString()
    });

    return saved;
  }

  async clearAll() {
    await this.requestsRepository.clear();
    return { cleared: true };
  }
}
