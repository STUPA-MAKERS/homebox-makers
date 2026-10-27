import { inject } from '@angular/core';
import { ApiClient } from '@core/api/api-client.service';
import type { EntityOut, EntitySummary, ItemAttachment } from '@core/api/models';
import { CollectionService } from '@core/collection/collection.service';

/** True when an entity is a location (a container), not an item. */
export function isLocation(entity: Pick<EntitySummary, 'entityType'>): boolean {
  return !!entity.entityType?.isLocation;
}

/** The route of an entity: `/locations/:id` for a location, else `/items/:id`. */
export function entityLink(entity: Pick<EntitySummary, 'id' | 'entityType'>): string[] {
  return [isLocation(entity) ? '/locations' : '/items', entity.id];
}

/** The photo attachments of an entity, the primary one first. */
export function photos(entity: EntityOut): ItemAttachment[] {
  return (entity.attachments ?? [])
    .filter((a) => a.type === 'photo')
    .sort((a, b) => Number(b.primary) - Number(a.primary));
}

/**
 * Builds image URLs of attachments in an injection context: the tenant of the selected
 * collection goes into the query, because an `<img>` request carries no header.
 */
export function injectAttachmentUrl(): (entityId: string, attachmentId: string) => string {
  const api = inject(ApiClient);
  const collections = inject(CollectionService);
  return (entityId, attachmentId) =>
    api.attachmentUrl(entityId, attachmentId, collections.selectedId());
}
