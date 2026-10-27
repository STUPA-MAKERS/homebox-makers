import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { EntityOut } from '@core/api/models';

export type CreateKind = 'item' | 'location';

/** What the create dialog starts with: the kind and an optional parent location or tag. */
export interface CreateRequest {
  kind: CreateKind;
  parentId?: string | null;
  tagId?: string | null;
}

/**
 * Opens the one create dialog of the app (mounted in the shell) from any page, and tells the
 * pages about a created entity, so a list can reload.
 */
@Injectable({ providedIn: 'root' })
export class CreateService {
  readonly request = signal<CreateRequest | null>(null);
  readonly created = new Subject<EntityOut>();

  open(request: CreateRequest): void {
    this.request.set(request);
  }

  close(): void {
    this.request.set(null);
  }
}
