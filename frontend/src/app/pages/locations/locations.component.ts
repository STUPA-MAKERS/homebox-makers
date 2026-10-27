import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiClient } from '@core/api/api-client.service';
import type { EntitySummary } from '@core/api/models';
import { RefDataService } from '@core/data/ref-data.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { I18nService } from '@core/i18n/i18n.service';
import { errorMessage } from '@shared/http-error';

import { injectListDetailPage } from '@shared/list-detail-page';
import { LIST_PAGE_STATE } from '@shared/ui/detail-none/list-none.component';
import { FabComponent } from '@shared/ui/fab/fab.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import {
  ButtonComponent,
  EmptyStateComponent,
  IconComponent,
  ListDetailLayoutComponent,
  ListItemComponent,
  NoteComponent,
  ScrollFadeDirective,
  SearchPillComponent,
  SkeletonComponent,
  StickyBarComponent,
  ConfirmDialogComponent,
  RowMenuComponent,
  type RowMenuItem,
  type RowMenuSection,
  ToastService,
} from '@stupa-makers/ui-kit';
import { CreateService } from '../../features/create/create.service';
import { EditDrawerService } from '../../features/edit/edit-drawer.service';

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
    FabComponent,
    ButtonComponent,
    EmptyStateComponent,
    IconComponent,
    ListItemComponent,
    NoteComponent,
    SearchPillComponent,
    SkeletonComponent,
    StickyBarComponent,
    RowMenuComponent,
    ConfirmDialogComponent,
    ListDetailLayoutComponent,
    RouterOutlet,
    ScrollFadeDirective,
  ],
  providers: [{ provide: LIST_PAGE_STATE, useExisting: forwardRef(() => LocationsComponent) }],
  host: { '[class.pane-page]': 'split()' },
  templateUrl: './locations.component.html',
  styleUrl: './locations.component.scss',
})
export class LocationsComponent {
  private readonly createSvc = inject(CreateService);
  private readonly router = inject(Router);
  readonly ref = inject(RefDataService);
  private readonly api = inject(ApiClient);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);
  private readonly editor = inject(EditDrawerService);

  /** The row whose deletion waits for the confirmation. */
  readonly deleting = signal<EntitySummary | null>(null);
  readonly busy = signal(false);

  readonly rowMenu = computed<RowMenuSection[]>(() => [
    {
      items: [
        { id: 'edit', label: this.i18n.translate('common.edit'), icon: 'edit' },
        { id: 'sub', label: this.i18n.translate('location.addSub'), icon: 'mappin' },
        { id: 'item', label: this.i18n.translate('location.addItem'), icon: 'plus' },
      ],
    },
    {
      items: [
        { id: 'delete', label: this.i18n.translate('common.delete'), icon: 'trash', danger: true },
      ],
    },
  ]);

  private readonly layout = viewChild(ListDetailLayoutComponent);
  private readonly panes = injectListDetailPage(this.layout);
  readonly selectedId = this.panes.selectedId;
  readonly split = this.panes.split;
  readonly hasRows = computed(() => this.ref.locations().length > 0);

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
    inject(ApiClient)
      .changed$.pipe(takeUntilDestroyed())
      .subscribe((kind) => kind === 'entity' && this.load());
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

  onRowMenu(action: RowMenuItem, loc: EntitySummary): void {
    switch (action.id) {
      case 'edit':
        this.editor.open(loc.id);
        break;
      case 'sub':
        this.createSvc.open({ kind: 'location', parentId: loc.id });
        break;
      case 'item':
        this.createSvc.open({ kind: 'item', parentId: loc.id });
        break;
      case 'delete':
        this.deleting.set(loc);
        break;
    }
  }

  confirmDelete(): void {
    const loc = this.deleting();
    if (!loc) return;
    this.busy.set(true);
    this.api.deleteEntity(loc.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.deleting.set(null);
        this.toast.show(this.i18n.translate('location.deleted', { name: loc.name }), 'success');
        this.ref.reload().subscribe();
        if (this.selectedId() === loc.id) void this.router.navigate(['/locations']);
      },
      error: (err) => {
        this.busy.set(false);
        this.deleting.set(null);
        this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger');
      },
    });
  }

  newLocation(): void {
    this.createSvc.open({ kind: 'location' });
  }

  /** "Zur Liste" (one pane at a time). */
  closeDetail(): void {
    void this.router.navigate(['/locations']);
  }
}
