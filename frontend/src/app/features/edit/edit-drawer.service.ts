import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { EntityOut, MaintenanceEntry, MaintenanceEntryWithDetails } from '@core/api/models';

/**
 * Opens an editor as a side pane over the page (the to-do card of STUPA-Workflow): an item
 * or a location (`open`), or a maintenance entry (`openMaintenance`). A detail listens to
 * `saved` or `maintenanceSaved` and shows the saved record.
 */
@Injectable({ providedIn: 'root' })
export class EditDrawerService {
  /** The id of the entity in the editor, or null while it is closed. */
  readonly id = signal<string | null>(null);
  readonly saved = new Subject<EntityOut>();
  /** The maintenance entry in the editor, or null. */
  readonly maintenance = signal<MaintenanceEntryWithDetails | null>(null);
  readonly maintenanceSaved = new Subject<MaintenanceEntry>();

  open(id: string): void {
    this.maintenance.set(null);
    this.id.set(id);
  }

  openMaintenance(entry: MaintenanceEntryWithDetails): void {
    this.id.set(null);
    this.maintenance.set(entry);
  }

  close(): void {
    this.id.set(null);
    this.maintenance.set(null);
  }
}
