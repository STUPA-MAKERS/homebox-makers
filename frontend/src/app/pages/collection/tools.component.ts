import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiClient } from '@core/api/api-client.service';
import type { ExportOut } from '@core/api/models';
import { CollectionService } from '@core/collection/collection.service';
import { I18nService } from '@core/i18n/i18n.service';
import { LocalizedDatePipe } from '@core/i18n/localized-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import type { TranslationKey } from '@core/i18n/translations';
import { errorMessage } from '@shared/http-error';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import {
  ButtonComponent,
  ButtonLinkComponent,
  CheckboxComponent,
  ConfirmDialogComponent,
  DialogComponent,
  EmptyStateComponent,
  FilePickerComponent,
  IconComponent,
  type IconName,
  NoteComponent,
  StatusTextComponent,
  ToastService,
} from '@stupa-makers/ui-kit';

type MaintenanceAction =
  | 'ensure-asset-ids'
  | 'ensure-import-refs'
  | 'zero-item-time-fields'
  | 'set-primary-photos'
  | 'create-missing-thumbnails';

interface ActionRow {
  id: MaintenanceAction;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  icon: IconName;
}

const ACTIONS: readonly ActionRow[] = [
  {
    id: 'ensure-asset-ids',
    titleKey: 'tools.action.assetIds',
    bodyKey: 'tools.action.assetIdsBody',
    icon: 'tag',
  },
  {
    id: 'ensure-import-refs',
    titleKey: 'tools.action.importRefs',
    bodyKey: 'tools.action.importRefsBody',
    icon: 'link',
  },
  {
    id: 'zero-item-time-fields',
    titleKey: 'tools.action.zeroTimes',
    bodyKey: 'tools.action.zeroTimesBody',
    icon: 'clock',
  },
  {
    id: 'set-primary-photos',
    titleKey: 'tools.action.primaryPhotos',
    bodyKey: 'tools.action.primaryPhotosBody',
    icon: 'image',
  },
  {
    id: 'create-missing-thumbnails',
    titleKey: 'tools.action.thumbnails',
    bodyKey: 'tools.action.thumbnailsBody',
    icon: 'grid',
  },
];

/**
 * The tools of the collection: CSV import and export, the bill of materials, backups
 * (server-side exports and restores), the label generator and the maintenance actions,
 * up to wiping the inventory.
 */
@Component({
  selector: 'app-tools',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    LocalizedDatePipe,
    PageHeaderComponent,
    ButtonComponent,
    ButtonLinkComponent,
    CheckboxComponent,
    ConfirmDialogComponent,
    DialogComponent,
    FilePickerComponent,
    EmptyStateComponent,
    IconComponent,
    NoteComponent,
    StatusTextComponent,
  ],
  templateUrl: './tools.component.html',
  styleUrls: ['./collection.component.scss', './tools.component.scss'],
})
export class ToolsComponent {
  private readonly api = inject(ApiClient);
  private readonly collections = inject(CollectionService);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);

  readonly actions = ACTIONS;
  readonly exports = signal<ExportOut[]>([]);
  readonly exportsError = signal(false);
  readonly busy = signal<string | null>(null);

  /** A file waiting for the confirmation of its import. */
  readonly pendingCsv = signal<File | null>(null);
  readonly pendingBackup = signal<File | null>(null);
  readonly pendingAction = signal<ActionRow | null>(null);
  readonly deletingExport = signal<ExportOut | null>(null);
  readonly wiping = signal(false);
  wipeLocations = false;
  wipeTags = false;
  wipeMaintenance = false;

  readonly csvUrl = computed(() => this.api.exportUrl(this.collections.selectedId()));
  readonly bomUrl = computed(() => this.api.billOfMaterialsUrl(this.collections.selectedId()));
  /** An export or import still runs on the server, so the list refreshes itself. */
  private readonly running = computed(() =>
    this.exports().some((e) => e.status === 'pending' || e.status === 'running'),
  );
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadExports();
    inject(DestroyRef).onDestroy(() => this.stopTimer());
  }

  loadExports(): void {
    this.stopTimer();
    this.api.exports().subscribe({
      next: (all) => {
        this.exportsError.set(false);
        this.exports.set(
          [...all].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
        );
        if (this.running()) this.timer = setTimeout(() => this.loadExports(), 2000);
      },
      error: () => this.exportsError.set(true),
    });
  }

  private stopTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  downloadUrl(exp: ExportOut): string {
    return this.api.exportDownloadUrl(exp.id, this.collections.selectedId());
  }

  statusKind(exp: ExportOut): 'accent' | 'warn' | 'error' | 'muted' {
    if (exp.status === 'completed') return 'accent';
    if (exp.status === 'failed') return 'error';
    return 'warn';
  }

  statusKey(exp: ExportOut): TranslationKey {
    switch (exp.status) {
      case 'completed':
        return 'tools.backup.status.completed';
      case 'failed':
        return 'tools.backup.status.failed';
      case 'running':
        return 'tools.backup.status.running';
      default:
        return 'tools.backup.status.pending';
    }
  }

  size(bytes: number): string {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
    }
    const digits = unit === 0 || value >= 10 ? 0 : 1;
    return `${value.toLocaleString(this.i18n.formatLocale(), { maximumFractionDigits: digits })} ${units[unit]}`;
  }

  createExport(): void {
    this.busy.set('export');
    this.api.createExport().subscribe({
      next: () => {
        this.busy.set(null);
        this.loadExports();
      },
      error: (err) => this.fail(err),
    });
  }

  confirmDeleteExport(): void {
    const exp = this.deletingExport();
    if (!exp) return;
    this.busy.set('delete');
    this.api.deleteExport(exp.id).subscribe({
      next: () => {
        this.busy.set(null);
        this.deletingExport.set(null);
        this.exports.update((all) => all.filter((e) => e.id !== exp.id));
      },
      error: (err) => {
        this.deletingExport.set(null);
        this.fail(err);
      },
    });
  }

  importCsv(): void {
    const file = this.pendingCsv();
    if (!file) return;
    this.busy.set('csv');
    this.api.importCsv(file).subscribe({
      next: () => {
        this.busy.set(null);
        this.pendingCsv.set(null);
        this.toast.show(this.i18n.translate('tools.csv.imported'), 'success');
      },
      error: (err) => {
        this.pendingCsv.set(null);
        this.fail(err);
      },
    });
  }

  importBackup(): void {
    const file = this.pendingBackup();
    if (!file) return;
    this.busy.set('backup');
    this.api.importBackup(file).subscribe({
      next: () => {
        this.busy.set(null);
        this.pendingBackup.set(null);
        this.toast.show(this.i18n.translate('tools.backup.importStarted'), 'success');
        this.loadExports();
      },
      error: (err) => {
        this.pendingBackup.set(null);
        this.fail(err);
      },
    });
  }

  runAction(): void {
    const action = this.pendingAction();
    if (!action) return;
    this.busy.set('action');
    this.api.runAction(action.id).subscribe({
      next: (res) => {
        this.busy.set(null);
        this.pendingAction.set(null);
        this.toast.show(
          this.i18n.translate('tools.action.done', { count: res?.completed ?? 0 }),
          'success',
        );
      },
      error: (err) => {
        this.pendingAction.set(null);
        this.fail(err);
      },
    });
  }

  openWipe(): void {
    this.wipeLocations = false;
    this.wipeTags = false;
    this.wipeMaintenance = false;
    this.wiping.set(true);
  }

  wipe(): void {
    this.busy.set('wipe');
    this.api
      .wipeInventory({
        wipeLocations: this.wipeLocations,
        wipeTags: this.wipeTags,
        wipeMaintenance: this.wipeMaintenance,
      })
      .subscribe({
        next: (res) => {
          this.busy.set(null);
          this.wiping.set(false);
          this.toast.show(
            this.i18n.translate('tools.wipe.done', { count: res?.completed ?? 0 }),
            'success',
          );
        },
        error: (err) => {
          this.wiping.set(false);
          this.fail(err);
        },
      });
  }

  private fail(err: unknown): void {
    this.busy.set(null);
    this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger');
  }
}
