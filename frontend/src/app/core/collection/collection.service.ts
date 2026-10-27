import { Injectable, computed, inject, signal } from '@angular/core';
import { type Observable, catchError, map, of, tap } from 'rxjs';
import { ApiClient } from '@core/api/api-client.service';
import type { Group, UserOut } from '@core/api/models';

const STORAGE_KEY = 'hb.collection';

/**
 * The collection (backend: group, tenant) the app works in.
 *
 * A user can belong to several collections. Every tenant-scoped request carries the
 * selected id in `X-Tenant` (`tenantInterceptor`); without it the server falls back to the
 * default group of the user. The choice is kept per browser.
 */
@Injectable({ providedIn: 'root' })
export class CollectionService {
  private readonly api = inject(ApiClient);

  private readonly _all = signal<Group[]>([]);
  private readonly _selectedId = signal<string | null>(this.readStored());

  /** Every collection of the user, in the order of the server. */
  readonly all = this._all.asReadonly();
  /** The id that goes into `X-Tenant`, or `null` for the default group. */
  readonly selectedId = this._selectedId.asReadonly();
  /** The selected collection, once the list is loaded. */
  readonly selected = computed(
    () => this._all().find((g) => g.id === this._selectedId()) ?? null,
  );
  /** Currency of the selected collection, for the money formats. */
  readonly currency = computed(() => this.selected()?.currency || 'EUR');

  /**
   * Load the collections and settle the selection: the stored one if the user still has
   * it, else the default group, else the first one.
   */
  load(user: UserOut): Observable<Group[]> {
    return this.api.groups().pipe(
      catchError(() => of([] as Group[])),
      tap((groups) => {
        this._all.set(groups);
        const stored = this._selectedId();
        if (stored && groups.some((g) => g.id === stored)) return;
        const fallback =
          groups.find((g) => g.id === user.defaultGroupId)?.id ?? groups[0]?.id ?? null;
        this.select(fallback);
      }),
      map((groups) => groups),
    );
  }

  select(id: string | null): void {
    this._selectedId.set(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Storage is blocked. The choice then lasts for this tab only. */
    }
  }

  /** Put a created or renamed collection into the list. */
  upsert(group: Group): void {
    this._all.update((all) =>
      all.some((g) => g.id === group.id)
        ? all.map((g) => (g.id === group.id ? group : g))
        : [...all, group],
    );
  }

  clear(): void {
    this._all.set([]);
  }

  private readStored(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
