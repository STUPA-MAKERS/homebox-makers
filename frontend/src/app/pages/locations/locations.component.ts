import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { EntitySummary } from '@core/api/models';
import { RefDataService } from '@core/data/ref-data.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import {
  ButtonComponent,
  EmptyStateComponent,
  IconComponent,
  ListItemComponent,
  NoteComponent,
  SearchPillComponent,
  SkeletonComponent,
  StickyBarComponent,
} from '@stupa-makers/ui-kit';
import { CreateService } from '../../features/create/create.service';

/** One row of the tree: a location, its depth and whether it has sub-locations. */
interface TreeRow {
  loc: EntitySummary;
  depth: number;
  path: string;
  hasChildren: boolean;
}

/**
 * All locations of the collection as a tree. A branch folds in and out; a search shows the
 * matching locations with their full path, without the tree.
 */
@Component({
  selector: 'app-locations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    PageHeaderComponent,
    ButtonComponent,
    EmptyStateComponent,
    IconComponent,
    ListItemComponent,
    NoteComponent,
    SearchPillComponent,
    SkeletonComponent,
    StickyBarComponent,
  ],
  templateUrl: './locations.component.html',
  styleUrl: './locations.component.scss',
})
export class LocationsComponent {
  private readonly createSvc = inject(CreateService);
  readonly ref = inject(RefDataService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly search = signal('');
  readonly collapsed = signal<ReadonlySet<string>>(new Set());

  /** The locations in tree order (depth first, by name). */
  private readonly ordered = computed<TreeRow[]>(() => {
    const all = this.ref.locations();
    const ids = new Set(all.map((l) => l.id));
    const kids = new Map<string | null, EntitySummary[]>();
    for (const l of all) {
      const parent = l.parent && ids.has(l.parent.id) ? l.parent.id : null;
      kids.set(parent, [...(kids.get(parent) ?? []), l]);
    }
    const rows: TreeRow[] = [];
    const seen = new Set<string>();
    const walk = (parent: string | null, depth: number, path: string) => {
      const list = [...(kids.get(parent) ?? [])].sort((a, b) => a.name.localeCompare(b.name));
      for (const loc of list) {
        if (seen.has(loc.id)) continue;
        seen.add(loc.id);
        const p = path ? `${path} › ${loc.name}` : loc.name;
        rows.push({ loc, depth, path: p, hasChildren: (kids.get(loc.id) ?? []).length > 0 });
        walk(loc.id, depth + 1, p);
      }
    };
    walk(null, 0, '');
    return rows;
  });

  readonly rows = computed<TreeRow[]>(() => {
    const q = this.search().trim().toLocaleLowerCase();
    if (q) return this.ordered().filter((r) => r.path.toLocaleLowerCase().includes(q));
    const collapsed = this.collapsed();
    const out: TreeRow[] = [];
    let hideBelow: number | null = null;
    for (const r of this.ordered()) {
      if (hideBelow !== null && r.depth > hideBelow) continue;
      hideBelow = null;
      out.push(r);
      if (collapsed.has(r.loc.id)) hideBelow = r.depth;
    }
    return out;
  });

  readonly hasBranches = computed(() => this.ordered().some((r) => r.hasChildren));
  readonly allCollapsed = computed(() =>
    this.ordered()
      .filter((r) => r.hasChildren && r.depth === 0)
      .every((r) => this.collapsed().has(r.loc.id)),
  );

  constructor() {
    this.load();
    this.createSvc.created.pipe(takeUntilDestroyed()).subscribe(() => this.load());
  }

  load(): void {
    this.error.set(false);
    this.ref.reload().subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  toggle(id: string): void {
    this.collapsed.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  toggleAll(): void {
    this.collapsed.set(
      this.allCollapsed()
        ? new Set()
        : new Set(
            this.ordered()
              .filter((r) => r.hasChildren)
              .map((r) => r.loc.id),
          ),
    );
  }

  newLocation(): void {
    this.createSvc.open({ kind: 'location' });
  }
}
