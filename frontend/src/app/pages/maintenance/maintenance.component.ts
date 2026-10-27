import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiClient, type MaintenanceStatus } from '@core/api/api-client.service';
import type { MaintenanceEntryWithDetails } from '@core/api/models';
import { I18nService } from '@core/i18n/i18n.service';
import { LocalizedDatePipe, apiDate } from '@core/i18n/localized-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { errorMessage } from '@shared/http-error';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import {
  ConfirmDialogComponent,
  EmptyStateComponent,
  IconComponent,
  NoteComponent,
  RowMenuComponent,
  type RowMenuItem,
  type RowMenuSection,
  SegmentedComponent,
  type SegmentedOption,
  SkeletonComponent,
  StatusTextComponent,
  ToastService,
} from '@stupa-makers/ui-kit';

/** Today as `YYYY-MM-DD` in local time (a completed date is a calendar day). */
function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * The maintenance of the whole collection: planned (overdue first), done, or both, with the
 * number of entries and the total cost. A planned entry can be marked done here; editing
 * happens on the page of its item. The filter lives in `?status=`.
 */
@Component({
  selector: 'app-maintenance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslatePipe,
    LocalizedDatePipe,
    MoneyPipe,
    PageHeaderComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    IconComponent,
    NoteComponent,
    RowMenuComponent,
    SegmentedComponent,
    SkeletonComponent,
    StatusTextComponent,
  ],
  templateUrl: './maintenance.component.html',
  styleUrl: './maintenance.component.scss',
})
export class MaintenanceComponent {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);

  /** Query `status`: scheduled (default), completed or both. */
  readonly status = input<string | undefined>();

  readonly entries = signal<MaintenanceEntryWithDetails[]>([]);
  readonly loading = signal(true);
  /** The first answer has come: a new filter then keeps the old rows until its answer. */
  readonly loaded = signal(false);
  private seq = 0;
  readonly error = signal(false);
  readonly deleting = signal<MaintenanceEntryWithDetails | null>(null);
  readonly busy = signal(false);

  readonly filter = computed<MaintenanceStatus>(() => {
    const s = this.status();
    return s === 'completed' || s === 'both' ? s : 'scheduled';
  });

  readonly filterOptions = computed<SegmentedOption[]>(() => [
    { value: 'scheduled', label: this.i18n.translate('maint.scheduled') },
    { value: 'completed', label: this.i18n.translate('maint.done') },
    { value: 'both', label: this.i18n.translate('maint.all') },
  ]);

  /** Planned entries by date (overdue first), then done ones, newest first. */
  readonly sorted = computed(() => {
    const time = (v: string | Date) => apiDate(v)?.getTime() ?? 0;
    const planned = this.entries()
      .filter((e) => !this.isDone(e))
      .sort((a, b) => time(a.scheduledDate) - time(b.scheduledDate));
    const done = this.entries()
      .filter((e) => this.isDone(e))
      .sort((a, b) => time(b.completedDate) - time(a.completedDate));
    return [...planned, ...done];
  });

  readonly totalCost = computed(() =>
    this.entries().reduce((sum, e) => sum + (Number.parseFloat(e.cost) || 0), 0),
  );
  readonly overdueCount = computed(() => this.entries().filter((e) => this.isOverdue(e)).length);

  constructor() {
    effect(() => this.load(this.filter()));
  }

  load(status = this.filter()): void {
    const seq = ++this.seq;
    this.loading.set(true);
    this.error.set(false);
    this.api.maintenanceAll(status).subscribe({
      next: (entries) => {
        if (seq !== this.seq) return;
        this.entries.set(entries ?? []);
        this.loading.set(false);
        this.loaded.set(true);
      },
      error: () => {
        if (seq !== this.seq) return;
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  setFilter(value: string | null): void {
    void this.router.navigate([], {
      queryParams: { status: value === 'scheduled' ? null : value },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  isDone(e: MaintenanceEntryWithDetails): boolean {
    return !!apiDate(e.completedDate);
  }

  isOverdue(e: MaintenanceEntryWithDetails): boolean {
    const due = apiDate(e.scheduledDate);
    return !this.isDone(e) && !!due && due.getTime() < new Date(`${today()}T00:00:00`).getTime();
  }

  cost(e: MaintenanceEntryWithDetails): number {
    return Number.parseFloat(e.cost) || 0;
  }

  menu(e: MaintenanceEntryWithDetails): RowMenuSection[] {
    return [
      {
        items: [
          ...(this.isDone(e)
            ? []
            : [
                {
                  id: 'done',
                  label: this.i18n.translate('maint.markDone'),
                  icon: 'check' as const,
                },
              ]),
          { id: 'item', label: this.i18n.translate('maint.openItem'), icon: 'package' },
        ],
      },
      {
        items: [
          {
            id: 'delete',
            label: this.i18n.translate('common.delete'),
            icon: 'trash',
            danger: true,
          },
        ],
      },
    ];
  }

  onMenu(e: MaintenanceEntryWithDetails, item: RowMenuItem): void {
    switch (item.id) {
      case 'done':
        this.markDone(e);
        break;
      case 'item':
        void this.router.navigate(['/items', e.itemID]);
        break;
      case 'delete':
        this.deleting.set(e);
        break;
    }
  }

  markDone(e: MaintenanceEntryWithDetails): void {
    this.api
      .updateMaintenance(e.id, {
        name: e.name,
        cost: e.cost || '0',
        description: e.description,
        scheduledDate: apiDate(e.scheduledDate) ? e.scheduledDate : '',
        completedDate: today(),
      })
      .subscribe({
        next: () => {
          this.toast.show(this.i18n.translate('maint.markedDone', { name: e.name }), 'success');
          this.load();
        },
        error: (err) =>
          this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger'),
      });
  }

  confirmDelete(): void {
    const e = this.deleting();
    if (!e) return;
    this.busy.set(true);
    this.api.deleteMaintenance(e.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.deleting.set(null);
        this.entries.update((all) => all.filter((x) => x.id !== e.id));
      },
      error: (err) => {
        this.busy.set(false);
        this.deleting.set(null);
        this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger');
      },
    });
  }
}
