import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiClient } from '@core/api/api-client.service';
import type { EntityOut, EntityPath } from '@core/api/models';
import { I18nService } from '@core/i18n/i18n.service';
import { LocalizedDatePipe, apiDate } from '@core/i18n/localized-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AppTitleStrategy } from '@core/title/title.strategy';
import { entityLink, injectAttachmentUrl, photos } from '@shared/entity.util';
import { errorMessage } from '@shared/http-error';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { EntityThumbComponent } from '@shared/ui/entity-thumb/entity-thumb.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { TagChipComponent } from '@shared/ui/tag-chip/tag-chip.component';
import {
  ButtonComponent,
  ButtonLinkComponent,
  ConfirmDialogComponent,
  EmptyStateComponent,
  FieldGroupComponent,
  FieldRowComponent,
  FileViewerComponent,
  type FileViewerItem,
  IconComponent,
  ListItemComponent,
  NoteComponent,
  RowMenuComponent,
  type RowMenuItem,
  type RowMenuSection,
  SkeletonComponent,
  ToastService,
} from '@stupa-makers/ui-kit';
import { AttachmentsPanelComponent } from '../../features/attachments/attachments-panel.component';
import { CreateService } from '../../features/create/create.service';
import { MaintenanceLogComponent } from '../../features/maintenance/maintenance-log.component';

/**
 * One item: the photos, the facts (identification, purchase, warranty, sale), the custom
 * fields, the tags, the sub-items, the files and the maintenance log. The header offers
 * edit, duplicate, the label, archive and delete.
 */
@Component({
  selector: 'app-item-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslatePipe,
    LocalizedDatePipe,
    MoneyPipe,
    PageHeaderComponent,
    EntityThumbComponent,
    TagChipComponent,
    ButtonComponent,
    ButtonLinkComponent,
    IconComponent,
    RowMenuComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    FieldGroupComponent,
    FieldRowComponent,
    FileViewerComponent,
    ListItemComponent,
    NoteComponent,
    SkeletonComponent,
    AttachmentsPanelComponent,
    MaintenanceLogComponent,
  ],
  templateUrl: './item-detail.component.html',
  styleUrl: './item-detail.component.scss',
})
export class ItemDetailComponent {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);
  private readonly title = inject(AppTitleStrategy);
  private readonly createSvc = inject(CreateService);
  private readonly url = injectAttachmentUrl();

  readonly id = input.required<string>();

  readonly item = signal<EntityOut | null>(null);
  readonly path = signal<EntityPath[]>([]);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly error = signal(false);
  readonly confirmDelete = signal(false);
  readonly busy = signal(false);
  readonly viewerOpen = signal(false);
  readonly viewerIndex = signal(0);

  readonly photos = computed(() => {
    const item = this.item();
    return item ? photos(item) : [];
  });
  readonly viewerItems = computed<FileViewerItem[]>(() => {
    const item = this.item();
    return this.photos().map((p) => ({
      name: p.title,
      url: this.url(item!.id, p.id),
      kind: 'image',
      mime: p.mimeType,
    }));
  });

  /** The parent chain without the item itself. */
  readonly crumbs = computed(() => this.path().slice(0, -1));

  readonly hasPurchase = computed(() => {
    const i = this.item();
    return !!i && (!!i.purchaseFrom || !!i.purchasePrice || !!apiDate(i.purchaseDate));
  });
  readonly hasWarranty = computed(() => {
    const i = this.item();
    return !!i && (i.lifetimeWarranty || !!apiDate(i.warrantyExpires) || !!i.warrantyDetails);
  });
  readonly hasSale = computed(() => {
    const i = this.item();
    return !!i && (!!i.soldTo || !!i.soldPrice || !!apiDate(i.soldDate) || !!i.soldNotes);
  });

  readonly menu = computed<RowMenuSection[]>(() => {
    const item = this.item();
    return [
      {
        items: [
          { id: 'duplicate', label: this.i18n.translate('item.duplicate'), icon: 'copy' },
          { id: 'sub', label: this.i18n.translate('item.addSub'), icon: 'plus' },
          { id: 'label', label: this.i18n.translate('item.label'), icon: 'tag' },
          {
            id: 'archive',
            label: this.i18n.translate(item?.archived ? 'item.unarchive' : 'item.archive'),
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
  });

  constructor() {
    effect(() => this.load(this.id()));
  }

  load(id = this.id()): void {
    this.loading.set(true);
    this.error.set(false);
    this.notFound.set(false);
    forkJoin({ item: this.api.entity(id), path: this.api.entityPath(id) }).subscribe({
      next: ({ item, path }) => {
        this.item.set(item);
        this.path.set(path ?? []);
        this.loading.set(false);
        this.title.setPageTitle(item.name);
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 404 || err?.status === 400) this.notFound.set(true);
        else this.error.set(true);
      },
    });
  }

  crumbLink(p: EntityPath): string[] {
    return [p.type === 'location' ? '/locations' : '/items', p.id];
  }

  childLink = entityLink;

  openPhoto(index: number): void {
    this.viewerIndex.set(index);
    this.viewerOpen.set(true);
  }

  onMenu(item: RowMenuItem): void {
    const current = this.item();
    if (!current) return;
    switch (item.id) {
      case 'duplicate':
        this.api
          .duplicateEntity(current.id, {
            copyAttachments: true,
            copyCustomFields: true,
            copyMaintenance: false,
            copyPrefix: this.i18n.translate('item.copyPrefix'),
          })
          .subscribe({
            next: (copy) => {
              this.toast.show(this.i18n.translate('item.duplicated'), 'success');
              void this.router.navigate(['/items', copy.id]);
            },
            error: (err) => this.fail(err),
          });
        break;
      case 'sub':
        this.createSvc.open({ kind: 'item', parentId: current.id });
        break;
      case 'label':
        window.open(this.api.labelUrl(current.id), '_blank', 'noopener');
        break;
      case 'archive':
        this.toggleArchive(current);
        break;
      case 'delete':
        this.confirmDelete.set(true);
        break;
    }
  }

  delete(): void {
    const current = this.item();
    if (!current) return;
    this.busy.set(true);
    this.api.deleteEntity(current.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.confirmDelete.set(false);
        this.toast.show(this.i18n.translate('item.deleted', { name: current.name }), 'success');
        void this.router.navigate(['/items']);
      },
      error: (err) => {
        this.busy.set(false);
        this.confirmDelete.set(false);
        this.fail(err);
      },
    });
  }

  private toggleArchive(current: EntityOut): void {
    this.api
      .updateEntity(current.id, {
        ...current,
        archived: !current.archived,
        entityTypeId: current.entityType?.id ?? '',
        parentId: current.parent?.id ?? null,
        tagIds: current.tags.map((t) => t.id),
      })
      .subscribe({
        next: (item) => this.item.set(item),
        error: (err) => this.fail(err),
      });
  }

  private fail(err: unknown): void {
    this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger');
  }
}
