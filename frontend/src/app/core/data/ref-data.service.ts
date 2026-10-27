import { Injectable, computed, inject, signal } from '@angular/core';
import { type Observable, catchError, forkJoin, map, of, shareReplay, tap } from 'rxjs';
import { ApiClient } from '@core/api/api-client.service';
import type { EntitySummary, EntityTypeSummary, TagOut } from '@core/api/models';

/** A location with the path of its parents, for a select ("Keller › Regal 2"). */
export interface LocationOption {
  id: string;
  name: string;
  path: string;
  depth: number;
}

/**
 * The reference data that many pages and forms need: the tags, the locations and the entity
 * types of the selected collection. Loaded once, shared, and reloaded after a change.
 */
@Injectable({ providedIn: 'root' })
export class RefDataService {
  private readonly api = inject(ApiClient);

  private readonly _tags = signal<TagOut[]>([]);
  private readonly _locations = signal<EntitySummary[]>([]);
  private readonly _types = signal<EntityTypeSummary[]>([]);
  private loading$: Observable<void> | null = null;
  private loaded = false;

  readonly tags = this._tags.asReadonly();
  readonly locations = this._locations.asReadonly();
  readonly types = this._types.asReadonly();

  readonly itemTypes = computed(() => this._types().filter((t) => !t.isLocation));
  readonly locationTypes = computed(() => this._types().filter((t) => t.isLocation));

  /** Every location with its full path, sorted by path. */
  readonly locationOptions = computed<LocationOption[]>(() => {
    const all = this._locations();
    const byId = new Map(all.map((l) => [l.id, l]));
    const chain = (l: EntitySummary): string[] => {
      const names: string[] = [];
      let cur: EntitySummary | undefined = l;
      const seen = new Set<string>();
      while (cur && !seen.has(cur.id)) {
        seen.add(cur.id);
        names.unshift(cur.name);
        cur = cur.parent ? (byId.get(cur.parent.id) ?? undefined) : undefined;
      }
      return names;
    };
    return all
      .map((l) => {
        const names = chain(l);
        return { id: l.id, name: l.name, path: names.join(' › '), depth: names.length - 1 };
      })
      .sort((a, b) => a.path.localeCompare(b.path));
  });

  /** Load once; later calls share the first answer. */
  ensureLoaded(): Observable<void> {
    if (this.loaded) return of(undefined);
    return this.reload();
  }

  reload(): Observable<void> {
    if (this.loading$) return this.loading$;
    this.loading$ = forkJoin({
      tags: this.api.tags().pipe(catchError(() => of([] as TagOut[]))),
      locations: this.api.locations().pipe(catchError(() => of([] as EntitySummary[]))),
      types: this.api.entityTypes().pipe(catchError(() => of([] as EntityTypeSummary[]))),
    }).pipe(
      tap(({ tags, locations, types }) => {
        this._tags.set(tags ?? []);
        this._locations.set(locations ?? []);
        this._types.set(types ?? []);
        this.loaded = true;
        this.loading$ = null;
      }),
      map(() => undefined),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.loading$;
  }
}
