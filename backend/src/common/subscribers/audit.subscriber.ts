import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { Logger } from '@nestjs/common';

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  private readonly logger = new Logger(AuditSubscriber.name);

  /**
   * Listen to all entities.
   */
  listenTo() {
    return 'all';
  }

  /**
   * Called after entity insertion.
   */
  afterInsert(event: InsertEvent<any>) {
    const entityName = event.metadata.name;
    // Log only relevant entities to avoid noise
    if (['User', 'Animal'].includes(entityName)) {
      this.logger.log(
        `AUDIT [INSERT]: Entity ${entityName} created with ID ${event.entity?.id}`,
      );
    }
  }

  /**
   * Called after entity update.
   */
  afterUpdate(event: UpdateEvent<any>) {
    const entityName = event.metadata.name;
    if (['User', 'Animal'].includes(entityName)) {
      this.logger.log(
        `AUDIT [UPDATE]: Entity ${entityName} updated with ID ${event.entity?.id}`,
      );
    }
  }
}
