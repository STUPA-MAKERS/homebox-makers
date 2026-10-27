import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ApiClient } from '@core/api/api-client.service';
import type { AttachmentKind, EntityOut, ItemAttachment } from '@core/api/models';
import { I18nService } from '@core/i18n/i18n.service';
import { LocalizedDatePipe } from '@core/i18n/localized-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import type { TranslationKey } from '@core/i18n/translations';
import { injectAttachmentUrl } from '@shared/entity.util';
import { errorMessage } from '@shared/http-error';
import {
  ConfirmDialogComponent,
  FileDropZoneComponent,
  IconComponent,
  type IconName,
  RowMenuComponent,
  type RowMenuItem,
  type RowMenuSection,
  EmptyStateComponent,
  ToastService,
} from '@stupa-makers/ui-kit';

const KINDS: readonly { value: AttachmentKind; key: TranslationKey; icon: IconName }[] = [
  { value: 'photo', key: 'attach.kind.photo', icon: 'image' },
  { value: 'manual', key: 'attach.kind.manual', icon: 'book' },
  { value: 'warranty', key: 'attach.kind.warranty', icon: 'shield' },
  { value: 'receipt', key: 'attach.kind.receipt', icon: 'receipt' },
  { value: 'attachment', key: 'attach.kind.attachment', icon: 'clip' },
];

/**
 * The files of an entity: photos, manuals, warranty papers, receipts and other files. A
 * drop or a pick uploads at once: an image as a photo, anything else as a file. A row opens
 * the file; its menu changes the kind, makes a photo the primary one or deletes the file.
 * Emits the entity after each change.
 */
@Component({
  selector: 'app-attachments-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    LocalizedDatePipe,
    IconComponent,
    FileDropZoneComponent,
    EmptyStateComponent,
    RowMenuComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './attachments-panel.component.html',
  styleUrl: './attachments-panel.component.scss',
})
export class AttachmentsPanelComponent {
  private readonly api = inject(ApiClient);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);
  private readonly url = injectAttachmentUrl();

  readonly entity = input.required<EntityOut>();
  readonly changed = output<EntityOut>();

  readonly uploading = signal(0);
  readonly deleting = signal<ItemAttachment | null>(null);
  readonly busy = signal(false);

  readonly files = computed(() =>
    [...(this.entity().attachments ?? [])]
      .filter((a) => a.type !== 'thumbnail')
      .sort((a, b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title)),
  );

  href(att: ItemAttachment): string {
    return this.url(this.entity().id, att.id);
  }

  icon(att: ItemAttachment): IconName {
    return KINDS.find((k) => k.value === att.type)?.icon ?? 'file';
  }

  kindLabel(att: ItemAttachment): string {
    const k = KINDS.find((x) => x.value === att.type);
    return k ? this.i18n.translate(k.key) : att.type;
  }

  menu(att: ItemAttachment): RowMenuSection[] {
    const top: RowMenuItem[] = [];
    if (att.type === 'photo' && !att.primary) {
      top.push({ id: 'primary', label: this.i18n.translate('attach.makePrimary'), icon: 'pin' });
    }
    const kinds: RowMenuItem[] = KINDS.filter((k) => k.value !== att.type).map((k) => ({
      id: `kind:${k.value}`,
      label: this.i18n.translate('attach.markAs', { kind: this.i18n.translate(k.key) }),
      icon: k.icon,
    }));
    const sections: RowMenuSection[] = [];
    if (top.length) sections.push({ items: top });
    sections.push({ items: kinds });
    sections.push({
      items: [
        { id: 'delete', label: this.i18n.translate('common.delete'), icon: 'trash', danger: true },
      ],
    });
    return sections;
  }

  upload(files: File[]): void {
    for (const file of files) {
      const kind: AttachmentKind = file.type.startsWith('image/') ? 'photo' : 'attachment';
      this.uploading.update((n) => n + 1);
      this.api.addAttachment(this.entity().id, file, file.name, kind).subscribe({
        next: (entity) => {
          this.uploading.update((n) => n - 1);
          this.changed.emit(entity);
        },
        error: (err) => {
          this.uploading.update((n) => n - 1);
          this.toast.show(
            errorMessage(err, this.i18n.translate('attach.uploadFailed', { name: file.name })),
            'danger',
          );
        },
      });
    }
  }

  onMenu(att: ItemAttachment, item: RowMenuItem): void {
    if (item.id === 'delete') {
      this.deleting.set(att);
      return;
    }
    const kind = item.id.startsWith('kind:') ? (item.id.slice(5) as AttachmentKind) : null;
    this.api
      .updateAttachment(this.entity().id, att.id, {
        primary: kind ? att.primary && kind === 'photo' : true,
        title: att.title,
        type: kind ?? att.type,
      })
      .subscribe({
        next: (entity) => this.changed.emit(entity),
        error: (err) =>
          this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger'),
      });
  }

  confirmDelete(): void {
    const att = this.deleting();
    if (!att) return;
    this.busy.set(true);
    this.api.deleteAttachment(this.entity().id, att.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.deleting.set(null);
        this.api.entity(this.entity().id).subscribe((e) => this.changed.emit(e));
      },
      error: (err) => {
        this.busy.set(false);
        this.deleting.set(null);
        this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger');
      },
    });
  }
}
