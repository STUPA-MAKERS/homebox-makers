import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { EntityOut } from '@core/api/models';

/**
 * Opens the editor of an item or a location as a side pane over the page (the to-do card
 * of STUPA-Workflow). A detail listens to `saved` and shows the saved entity.
 */
@Injectable({ providedIn: 'root' })
export class EditDrawerService {
  /** The id of the entity in the editor, or null while it is closed. */
  readonly id = signal<string | null>(null);
  readonly saved = new Subject<EntityOut>();

  open(id: string): void {
    this.id.set(id);
  }

  close(): void {
    this.id.set(null);
  }
}
