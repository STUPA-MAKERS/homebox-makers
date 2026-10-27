import { InjectionToken, type Signal } from '@angular/core';
import type { MaintenanceEntryWithDetails } from '@core/api/models';
import { apiDate } from '@core/i18n/localized-date.pipe';

/** The groups of the list, in their order. */
export type MaintGroup = 'over' | 'soon' | 'later' | 'undated' | 'done';

/** What the maintenance page shares with the detail beside it. */
export interface MaintenancePage {
  /** Every entry of the collection, planned and done. */
  readonly entries: Signal<MaintenanceEntryWithDetails[]>;
  readonly loading: Signal<boolean>;
  readonly split: Signal<boolean>;
  reload(): void;
  markDone(entry: MaintenanceEntryWithDetails): void;
  askDelete(entry: MaintenanceEntryWithDetails): void;
}

export const MAINTENANCE_PAGE = new InjectionToken<MaintenancePage>('MAINTENANCE_PAGE');

/** Today as `YYYY-MM-DD` in local time (a completed date is a calendar day). */
export function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const DAY = 86_400_000;

function midnight(): number {
  return new Date(`${today()}T00:00:00`).getTime();
}

export function isDone(e: MaintenanceEntryWithDetails): boolean {
  return !!apiDate(e.completedDate);
}

/** Whole days since a planned entry was due; 0 or less when it is not overdue. */
export function daysOverdue(e: MaintenanceEntryWithDetails): number {
  const due = apiDate(e.scheduledDate);
  if (isDone(e) || !due) return 0;
  return Math.ceil((midnight() - due.getTime()) / DAY);
}

export function groupOf(e: MaintenanceEntryWithDetails): MaintGroup {
  if (isDone(e)) return 'done';
  const due = apiDate(e.scheduledDate);
  if (!due) return 'undated';
  const days = (due.getTime() - midnight()) / DAY;
  if (days < 0) return 'over';
  return days <= 30 ? 'soon' : 'later';
}

export function cost(e: MaintenanceEntryWithDetails): number {
  return Number.parseFloat(e.cost) || 0;
}
