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
import { ApiClient } from '@core/api/api-client.service';
import type { EntitySummary, TagOut } from '@core/api/models';
import { RefDataService } from '@core/data/ref-data.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AppTitleStrategy } from '@core/title/title.strategy';
import { errorMessage } from '@shared/http-error';
import { EntityThumbComponent } from '@shared/ui/entity-thumb/entity-thumb.component';
import { LIST_PAGE_STATE } from '@shared/ui/detail-none/list-none.component';
import { TagStripComponent } from '@shared/ui/tag-chip/tag-strip.component';
import { TagItemsDialogComponent } from '../../features/tags/tag-items-dialog.component';
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
import { CreateService } from '../../features/create/create.service';
import { TagDialogComponent } from '../../features/tags/tag-dialog.component';

const PAGE_SIZE = 30;

/** One tag: its parent and sub-tags and the items that carry it. Edit, sub-tag and delete. */
@Component({
  selector: 'app-tag-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslatePipe,
    SheetBarComponent,
    SheetBarTitleDirective,
    EntityThumbComponent,
    TagStripComponent,
    TagItemsDialogComponent,
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
    TagDialogComponent,
  ],
  templateUrl: './tag-detail.component.html',
  styleUrl: './tag-detail.component.scss',
})
export class TagDetailComponent {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);
  private readonly title = inject(AppTitleStrategy);
  private readonly createSvc = inject(CreateService);
  private readonly ref = inject(RefDataService);
  private readonly page = inject(LIST_PAGE_STATE, { optional: true });

  /** The detail sits beside the list, so the sheet bar reaches into its padding. */
  readonly split = computed(() => this.page?.split() ?? false);

  readonly id = input.required<string>();

  readonly tag = signal<TagOut | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly error = signal(false);
  readonly editing = signal(false);
  readonly addingSub = signal(false);
  readonly confirmDelete = signal(false);
  readonly busy = signal(false);

  readonly items = signal<EntitySummary[]>([]);
  readonly itemsTotal = signal(0);
  readonly itemsLoading = signal(true);
  readonly itemsMore = signal(false);
  private itemsPage = 1;
  readonly assigning = signal(false);

  readonly children = computed(() =>
    this.ref
      .tags()
      .filter((t) => t.parentId === this.id())
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  readonly menu = computed<RowMenuSection[]>(() => [
    {
      items: [
        { id: 'sub', label: this.i18n.translate('tag.addSub'), icon: 'plus' },
        { id: 'item', label: this.i18n.translate('tag.addItem'), icon: 'package' },
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
    this.createSvc.created.pipe(takeUntilDestroyed()).subscribe(() => this.loadItems(true));
  }

  load(id = this.id()): void {
    this.loading.set(true);
    this.error.set(false);
    this.notFound.set(false);
    this.api.tag(id).subscribe({
      next: (tag) => {
        this.tag.set(tag);
        this.loading.set(false);
        this.title.setPageTitle(tag.name);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 404 || err?.status === 400) this.notFound.set(true);
        else this.error.set(true);
      },
    });
    this.loadItems(true);
  }

  onAssigned(): void {
    this.assigning.set(false);
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
    this.api.entities({ tags: [this.id()], page: this.itemsPage, pageSize: PAGE_SIZE }).subscribe({
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

  onMenu(item: RowMenuItem): void {
    switch (item.id) {
      case 'sub':
        this.addingSub.set(true);
        break;
      case 'item':
        this.createSvc.open({ kind: 'item', tagId: this.id() });
        break;
      case 'delete':
        this.confirmDelete.set(true);
        break;
    }
  }

  onSaved(tag: TagOut): void {
    this.editing.set(false);
    this.tag.set(tag);
    this.title.setPageTitle(tag.name);
  }

  onSubCreated(tag: TagOut): void {
    this.addingSub.set(false);
    void this.router.navigate(['/tags', tag.id]);
  }

  delete(): void {
    const tag = this.tag();
    if (!tag) return;
    this.busy.set(true);
    this.api.deleteTag(tag.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.confirmDelete.set(false);
        this.toast.show(this.i18n.translate('tag.deleted', { name: tag.name }), 'success');
        this.ref.reload().subscribe();
        void this.router.navigate(['/tags']);
      },
      error: (err) => {
        this.busy.set(false);
        this.confirmDelete.set(false);
        this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger');
      },
    });
  }
}
