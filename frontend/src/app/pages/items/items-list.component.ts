import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet } from '@angular/router';
import { CollectionService } from '@core/collection/collection.service';
import { errorMessage } from '@shared/http-error';
import { Subject, debounceTime, switchMap, catchError, of, tap } from 'rxjs';
import { ApiClient } from '@core/api/api-client.service';
import type { EntityListResult, EntityQuery, EntitySummary } from '@core/api/models';
import { RefDataService } from '@core/data/ref-data.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import type { TranslationKey } from '@core/i18n/translations';
import { injectListDetailPage } from '@shared/list-detail-page';
import { LIST_PAGE_STATE } from '@shared/ui/detail-none/list-none.component';
import { EntityThumbComponent } from '@shared/ui/entity-thumb/entity-thumb.component';
import { FabComponent } from '@shared/ui/fab/fab.component';
import { TagStripComponent } from '@shared/ui/tag-chip/tag-strip.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import {
  ButtonComponent,
  ConfirmDialogComponent,
  EmptyStateComponent,
  FilterSelectComponent,
  type FilterSelectOption,
  IconComponent,
  InfiniteScrollDirective,
  ListDetailLayoutComponent,
  ListItemComponent,
  NoteComponent,
  RowMenuComponent,
  type RowMenuItem,
  type RowMenuSection,
  ScrollFadeDirective,
  SearchPillComponent,
  SkeletonComponent,
  StickyBarComponent,
  ToastService,
} from '@stupa-makers/ui-kit';
import { CreateService } from '../../features/create/create.service';
import { EditDrawerService } from '../../features/edit/edit-drawer.service';

const PAGE_SIZE = 30;

const SORTS: readonly { value: string; key: TranslationKey }[] = [
  { value: 'name', key: 'items.sort.name' },
  { value: 'createdAt', key: 'items.sort.createdAt' },
  { value: 'updatedAt', key: 'items.sort.updatedAt' },
  { value: 'assetId', key: 'items.sort.assetId' },
  { value: 'purchasePrice', key: 'items.sort.purchasePrice' },
  { value: 'location', key: 'items.sort.location' },
  { value: 'quantity', key: 'items.sort.quantity' },
];

/**
 * The item list of the collection: the search, the filters (location, tags, archived) and
 * the sort live in the URL (`?q=&loc=&tags=&archived=&sort=&dir=`), so a filtered list can
 * be bookmarked and the back button restores it. The rows load page by page while the list
 * scrolls. A search that starts with `#` finds an asset id.
 */
@Component({
  selector: 'app-items-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    IconComponent,
    PageHeaderComponent,
    FabComponent,
    TagStripComponent,
    EntityThumbComponent,
    ButtonComponent,
    ListItemComponent,
    EmptyStateComponent,
    NoteComponent,
    SkeletonComponent,
    SearchPillComponent,
    StickyBarComponent,
    FilterSelectComponent,
    RowMenuComponent,
    ConfirmDialogComponent,
    InfiniteScrollDirective,
    ListDetailLayoutComponent,
    RouterOutlet,
    ScrollFadeDirective,
  ],
  providers: [{ provide: LIST_PAGE_STATE, useExisting: forwardRef(() => ItemsListComponent) }],
  host: { '[class.pane-page]': 'split()' },
  templateUrl: './items-list.component.html',
  styleUrl: './items-list.component.scss',
})
export class ItemsListComponent {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly createSvc = inject(CreateService);
  private readonly toast = inject(ToastService);
  private readonly editor = inject(EditDrawerService);
  private readonly collections = inject(CollectionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly ref = inject(RefDataService);

  private readonly layout = viewChild(ListDetailLayoutComponent);
  private readonly panes = injectListDetailPage(this.layout);
  readonly selectedId = this.panes.selectedId;
  readonly split = this.panes.split;

  // Query parameters (router input binding).
  readonly q = input<string | undefined>();
  readonly loc = input<string | undefined>();
  readonly tags = input<string | string[] | undefined>();
  readonly archived = input<string | undefined>();
  readonly sort = input<string | undefined>();
  readonly dir = input<string | undefined>();
  readonly focus = input<string | undefined>();

  readonly searchText = signal('');
  private readonly search$ = new Subject<string>();

  readonly items = signal<EntitySummary[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(true);
  /** The row whose deletion waits for the confirmation. */
  readonly deleting = signal<EntitySummary | null>(null);
  readonly busy = signal(false);
  /** The first answer has come: a new filter then keeps the old rows until its answer. */
  readonly loaded = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal(false);
  private readonly query$ = new Subject<EntityQuery>();

  readonly tagIds = computed(() => {
    const t = this.tags();
    return t === undefined ? [] : Array.isArray(t) ? t : [t];
  });
  readonly includeArchived = computed(() => this.archived() === '1');
  readonly sortBy = computed(() => this.sort() ?? 'name');
  readonly sortDir = computed<'asc' | 'desc'>(() => (this.dir() === 'desc' ? 'desc' : 'asc'));
  readonly hasRows = computed(() => this.items().length > 0);
  readonly hasMore = computed(() => this.items().length < this.total());

  readonly locationOptions = computed<FilterSelectOption[]>(() =>
    this.ref.locationOptions().map((l) => ({ value: l.id, label: l.path })),
  );
  readonly tagOptions = computed<FilterSelectOption[]>(() =>
    this.ref.tags().map((t) => ({ value: t.id, label: t.name })),
  );
  readonly archivedOptions = computed<FilterSelectOption[]>(() => [
    { value: '', label: this.i18n.translate('items.filter.activeOnly') },
    { value: '1', label: this.i18n.translate('items.filter.withArchived') },
  ]);

  readonly locationText = computed(() => {
    const id = this.loc();
    return id ? (this.ref.locationOptions().find((l) => l.id === id)?.name ?? null) : null;
  });
  readonly tagText = computed(() => {
    const ids = this.tagIds();
    if (!ids.length) return null;
    if (ids.length === 1) return this.ref.tags().find((t) => t.id === ids[0])?.name ?? null;
    return this.i18n.translate('items.filter.tagCount', { count: ids.length });
  });
  readonly filterCount = computed(
    () => (this.loc() ? 1 : 0) + (this.tagIds().length ? 1 : 0) + (this.includeArchived() ? 1 : 0),
  );

  readonly sortSections = computed<RowMenuSection[]>(() => [
    {
      label: this.i18n.translate('items.sort.by'),
      items: SORTS.map((s) => ({
        id: `sort:${s.value}`,
        label: this.i18n.translate(s.key),
        icon: this.sortBy() === s.value ? 'check' : undefined,
      })),
    },
    {
      label: this.i18n.translate('items.sort.direction'),
      items: [
        {
          id: 'dir:asc',
          label: this.i18n.translate('items.sort.asc'),
          icon: this.sortDir() === 'asc' ? 'check' : undefined,
        },
        {
          id: 'dir:desc',
          label: this.i18n.translate('items.sort.desc'),
          icon: this.sortDir() === 'desc' ? 'check' : undefined,
        },
      ],
    },
  ]);

  constructor() {
    this.ref.ensureLoaded().subscribe();

    this.query$
      .pipe(
        tap(() => this.error.set(false)),
        switchMap((query) =>
          this.api.entities(query).pipe(
            catchError(() => {
              this.error.set(true);
              return of<EntityListResult | null>(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        const first = this.page() === 1;
        this.loading.set(false);
        this.loadingMore.set(false);
        if (!res) return;
        this.loaded.set(true);
        this.total.set(res.total);
        this.items.update((cur) => (first ? (res.items ?? []) : [...cur, ...(res.items ?? [])]));
      });

    this.search$
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((q) => this.navigate({ q: q || null }));

    // A change of the URL query reloads the first page.
    effect(() => {
      const query: EntityQuery = {
        q: this.q() || undefined,
        parentIds: this.loc() ? [this.loc()!] : undefined,
        tags: this.tagIds().length ? this.tagIds() : undefined,
        includeArchived: this.includeArchived() || undefined,
        orderBy: this.sortBy(),
        orderDirection: this.sortDir(),
        page: 1,
        pageSize: PAGE_SIZE,
      };
      untracked(() => {
        this.searchText.set(this.q() ?? '');
        this.page.set(1);
        this.loading.set(true);
        this.query$.next(query);
      });
    });

    // A write anywhere (the detail beside the list, the create dialog) refreshes the rows
    // in place, without the skeleton.
    this.api.changed$.pipe(takeUntilDestroyed()).subscribe((kind) => {
      if (kind !== 'entity') return;
      this.page.set(1);
      this.query$.next(this.currentQuery(1));
    });

    afterNextRender(() => {
      if (this.focus() === 'search') {
        this.host.nativeElement.querySelector<HTMLInputElement>('app-search-pill input')?.focus();
      }
    });
  }

  /** "Zur Liste" (one pane at a time): close the detail and keep the filters. */
  closeDetail(): void {
    void this.router.navigate(['/items'], { queryParamsHandling: 'preserve' });
  }

  onSearch(value: string): void {
    this.searchText.set(value);
    this.search$.next(value.trim());
  }

  setLocation(id: string): void {
    this.navigate({ loc: id || null });
  }

  setTags(ids: readonly string[]): void {
    this.navigate({ tags: ids.length ? [...ids] : null });
  }

  setArchived(value: string): void {
    this.navigate({ archived: value || null });
  }

  onSortMenu(item: RowMenuItem): void {
    const [kind, value] = item.id.split(':');
    if (kind === 'sort') this.navigate({ sort: value === 'name' ? null : value });
    if (kind === 'dir') this.navigate({ dir: value === 'asc' ? null : value });
  }

  resetFilters(): void {
    this.navigate({ loc: null, tags: null, archived: null });
  }

  loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) return;
    this.loadingMore.set(true);
    this.page.update((p) => p + 1);
    this.query$.next(this.currentQuery(this.page()));
  }

  reload(): void {
    this.page.set(1);
    this.loading.set(true);
    this.query$.next(this.currentQuery(1));
  }

  newItem(): void {
    this.createSvc.open({
      kind: 'item',
      parentId: this.loc() ?? null,
      tagId: this.tagIds()[0] ?? null,
    });
  }

  /** The actions of a row, the same as in the menu of the item itself. */
  rowMenu(item: EntitySummary): RowMenuSection[] {
    return [
      {
        items: [
          { id: 'edit', label: this.i18n.translate('common.edit'), icon: 'edit' },
          { id: 'duplicate', label: this.i18n.translate('item.duplicate'), icon: 'copy' },
          { id: 'label', label: this.i18n.translate('item.label'), icon: 'printer' },
          {
            id: 'archive',
            label: this.i18n.translate(item.archived ? 'item.unarchive' : 'item.archive'),
            icon: 'archive',
          },
        ],
      },
      {
        items: [
          { id: 'delete', label: this.i18n.translate('common.delete'), icon: 'trash', danger: true },
        ],
      },
    ];
  }

  onRowMenu(action: RowMenuItem, item: EntitySummary): void {
    switch (action.id) {
      case 'edit':
        this.editor.open(item.id);
        break;
      case 'duplicate':
        this.api
          .duplicateEntity(item.id, {
            copyAttachments: true,
            copyCustomFields: true,
            copyMaintenance: false,
            copyPrefix: this.i18n.translate('item.copyPrefix'),
          })
          .subscribe({
            next: (copy) => {
              this.toast.show(this.i18n.translate('item.duplicated'), 'success');
              void this.router.navigate(['/items', copy.id], { queryParamsHandling: 'preserve' });
            },
            error: (err) => this.fail(err),
          });
        break;
      case 'label':
        window.open(this.api.labelUrl(item.id, this.collections.selectedId()), '_blank', 'noopener');
        break;
      case 'archive':
        this.api.entity(item.id).pipe(
          switchMap((full) =>
            this.api.updateEntity(full.id, {
              ...full,
              archived: !full.archived,
              entityTypeId: full.entityType?.id ?? '',
              parentId: full.parent?.id ?? null,
              tagIds: full.tags.map((t) => t.id),
            }),
          ),
        ).subscribe({ error: (err) => this.fail(err) });
        break;
      case 'delete':
        this.deleting.set(item);
        break;
    }
  }

  confirmDelete(): void {
    const item = this.deleting();
    if (!item) return;
    this.busy.set(true);
    this.api.deleteEntity(item.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.deleting.set(null);
        this.toast.show(this.i18n.translate('item.deleted', { name: item.name }), 'success');
        if (this.selectedId() === item.id) this.closeDetail();
      },
      error: (err) => {
        this.busy.set(false);
        this.deleting.set(null);
        this.fail(err);
      },
    });
  }

  private fail(err: unknown): void {
    this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger');
  }

  /** The location of a row, as its second line; the tags show at its end. */
  subLine(item: EntitySummary): string {
    const parts: string[] = [];
    if (item.parent) parts.push(item.parent.name);
    return parts.join(' · ');
  }

  private currentQuery(page: number): EntityQuery {
    return {
      q: this.q() || undefined,
      parentIds: this.loc() ? [this.loc()!] : undefined,
      tags: this.tagIds().length ? this.tagIds() : undefined,
      includeArchived: this.includeArchived() || undefined,
      orderBy: this.sortBy(),
      orderDirection: this.sortDir(),
      page,
      pageSize: PAGE_SIZE,
    };
  }

  private navigate(params: Record<string, string | string[] | null>): void {
    void this.router.navigate([], {
      queryParams: { ...params, focus: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
