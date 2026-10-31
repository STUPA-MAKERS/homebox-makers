import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiClient } from '@core/api/api-client.service';
import type { EntityOut, EntityPath, EntitySummary } from '@core/api/models';
import { RefDataService } from '@core/data/ref-data.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AppTitleStrategy } from '@core/title/title.strategy';
import { errorMessage } from '@shared/http-error';
import { EntityThumbComponent } from '@shared/ui/entity-thumb/entity-thumb.component';
import { TagChipComponent } from '@shared/ui/tag-chip/tag-chip.component';
import { TagStripComponent } from '@shared/ui/tag-chip/tag-strip.component';
import {
  ButtonComponent,
  ButtonLinkComponent,
  ConfirmDialogComponent,
  EmptyStateComponent,
  IconComponent,
  InfiniteScrollDirective,
  ListItemComponent,
  NoteComponent,
  RowMenuComponent,
  type RowMenuItem,
  type RowMenuSection,
  SheetBarComponent,
  SheetBarTitleDirective,
  SkeletonComponent,
  ToastService,
} from '@stupa-makers/ui-kit';
import { LIST_PAGE_STATE } from '@stupa-makers/ui-kit/shell';
import { AttachmentsPanelComponent } from '../../features/attachments/attachments-panel.component';
import { TagAssignComponent } from '../../features/tags/tag-assign.component';
import { CreateService } from '../../features/create/create.service';
import { EditDrawerService } from '../../features/edit/edit-drawer.service';
import { LabelViewerComponent } from '../../features/labels/label-viewer.component';

const PAGE_SIZE = 30;

/**
 * One location: its path, the sub-locations, the items directly in it and its files. The header offers edit, a new sub-location or item here,
 * the label and delete.
 */
@Component({
  selector: 'app-location-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LabelViewerComponent,
    RouterLink,
    TranslatePipe,
    SheetBarComponent,
    SheetBarTitleDirective,
    EntityThumbComponent,
    TagChipComponent,
    TagStripComponent,
    ButtonComponent,
    ButtonLinkComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    IconComponent,
    InfiniteScrollDirective,
    ListItemComponent,
    NoteComponent,
    RowMenuComponent,
    SkeletonComponent,
    AttachmentsPanelComponent,
    TagAssignComponent,
  ],
  templateUrl: './location-detail.component.html',
  styleUrl: './location-detail.component.scss',
})
export class LocationDetailComponent {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);
  private readonly title = inject(AppTitleStrategy);
  private readonly createSvc = inject(CreateService);
  private readonly ref = inject(RefDataService);
  private readonly editor = inject(EditDrawerService);
  private readonly page = inject(LIST_PAGE_STATE, { optional: true });

  /** The detail sits beside the list, so the sheet bar reaches into its padding. */
  readonly split = computed(() => this.page?.split() ?? false);

  readonly id = input.required<string>();

  readonly location = signal<EntityOut | null>(null);
  readonly path = signal<EntityPath[]>([]);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly error = signal(false);
  readonly confirmDelete = signal(false);
  readonly labelOpen = signal(false);
  readonly busy = signal(false);

  readonly items = signal<EntitySummary[]>([]);
  readonly itemsTotal = signal(0);
  readonly itemsLoading = signal(true);
  readonly itemsMore = signal(false);
  private itemsPage = 1;

  readonly crumbs = computed(() => this.path().slice(0, -1));

  /** The direct sub-locations, from the shared list (it carries the item counts). */
  readonly subLocations = computed(() =>
    this.ref
      .locations()
      .filter((l) => l.parent?.id === this.id())
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  readonly menu = computed<RowMenuSection[]>(() => [
    {
      items: [
        { id: 'sub', label: this.i18n.translate('location.addSub'), icon: 'mappin' },
        { id: 'item', label: this.i18n.translate('location.addItem'), icon: 'package' },
        { id: 'label', label: this.i18n.translate('item.label'), icon: 'printer' },
      ],
    },
    {
      items: [
        { id: 'delete', label: this.i18n.translate('common.delete'), icon: 'trash', danger: true },
      ],
    },
  ]);

  constructor() {
    this.ref.ensureLoaded().subscribe();
    effect(() => this.load(this.id()));
    this.createSvc.created.pipe(takeUntilDestroyed()).subscribe(() => {
      this.ref.reload().subscribe();
      this.loadItems(true);
    });
    this.editor.saved.pipe(takeUntilDestroyed()).subscribe((saved) => {
      if (saved.id !== this.id()) return;
      this.ref.reload().subscribe();
      this.load();
    });
  }

  load(id = this.id()): void {
    this.loading.set(true);
    this.error.set(false);
    this.notFound.set(false);
    forkJoin({ loc: this.api.entity(id), path: this.api.entityPath(id) }).subscribe({
      next: ({ loc, path }) => {
        this.location.set(loc);
        this.path.set(path ?? []);
        this.loading.set(false);
        this.title.setPageTitle(loc.name);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 404 || err?.status === 400) this.notFound.set(true);
        else this.error.set(true);
      },
    });
    this.loadItems(true);
  }

  loadItems(reset = false): void {
    if (reset) {
      this.itemsPage = 1;
      this.itemsLoading.set(true);
    } else {
      if (this.itemsMore() || this.items().length >= this.itemsTotal()) return;
      this.itemsMore.set(true);
      this.itemsPage++;
    }
    this.api
      .entities({ parentIds: [this.id()], page: this.itemsPage, pageSize: PAGE_SIZE })
      .subscribe({
        next: (res) => {
          this.itemsTotal.set(res.total);
          this.items.update((cur) => (reset ? (res.items ?? []) : [...cur, ...(res.items ?? [])]));
          this.itemsLoading.set(false);
          this.itemsMore.set(false);
        },
        error: () => {
          this.itemsLoading.set(false);
          this.itemsMore.set(false);
        },
      });
  }

  crumbLink(p: EntityPath): string[] {
    return [p.type === 'location' ? '/locations' : '/items', p.id];
  }

  /** The location of an item when it is in a sub-location, as its second line. */
  subLine(item: EntitySummary): string | null {
    return item.parent && item.parent.id !== this.id() ? item.parent.name : null;
  }

  edit(): void {
    const loc = this.location();
    if (loc) this.editor.open(loc.id);
  }

  addSub(): void {
    this.createSvc.open({ kind: 'location', parentId: this.id() });
  }

  onMenu(item: RowMenuItem): void {
    const loc = this.location();
    if (!loc) return;
    switch (item.id) {
      case 'sub':
        this.addSub();
        break;
      case 'item':
        this.createSvc.open({ kind: 'item', parentId: loc.id });
        break;
      case 'label':
        this.labelOpen.set(true);
        break;
      case 'delete':
        this.confirmDelete.set(true);
        break;
    }
  }

  delete(): void {
    const loc = this.location();
    if (!loc) return;
    this.busy.set(true);
    this.api.deleteEntity(loc.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.confirmDelete.set(false);
        this.toast.show(this.i18n.translate('location.deleted', { name: loc.name }), 'success');
        this.ref.reload().subscribe();
        void this.router.navigate(loc.parent ? ['/locations', loc.parent.id] : ['/locations']);
      },
      error: (err) => {
        this.busy.set(false);
        this.confirmDelete.set(false);
        this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger');
      },
    });
  }
}
