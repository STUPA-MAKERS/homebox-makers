import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet } from '@angular/router';
import { ApiClient } from '@core/api/api-client.service';
import type { MaintenanceEntryWithDetails } from '@core/api/models';
import { I18nService } from '@core/i18n/i18n.service';
import { apiDate } from '@core/i18n/localized-date.pipe';
import type { TranslationKey } from '@core/i18n/translations';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { errorMessage } from '@shared/http-error';
import { injectListDetailPage } from '@shared/list-detail-page';
import { LIST_PAGE_STATE } from '@shared/ui/detail-none/list-none.component';
import { FabComponent } from '@shared/ui/fab/fab.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import {
  ConfirmDialogComponent,
  DateBlockComponent,
  EmptyStateComponent,
  FilterSelectComponent,
  type FilterSelectOption,
  ListDetailLayoutComponent,
  ListItemComponent,
  NoteComponent,
  RowMenuComponent,
  type RowMenuItem,
  type RowMenuSection,
  ScrollFadeDirective,
  SkeletonComponent,
  StatusTextComponent,
  StickyBarComponent,
  ToastService,
} from '@stupa-makers/ui-kit';
import { EditDrawerService } from '../../features/edit/edit-drawer.service';
import {
  MAINTENANCE_PAGE,
  type MaintGroup,
  type MaintenancePage,
  daysOverdue,
  groupOf,
  isDone,
  today,
} from './maintenance-page';
import { MaintenancePlanDialogComponent } from './maintenance-plan-dialog.component';

type StatusFilter = 'scheduled' | 'completed' | 'both';

const GROUP_TITLES: Record<MaintGroup, TranslationKey> = {
  over: 'maint.group.over',
  soon: 'maint.group.soon',
  later: 'maint.group.later',
  undated: 'maint.group.undated',
  done: 'maint.done',
};

/**
 * The maintenance of the whole collection as a list page: the entries grouped by when they
 * are due (overdue, the next 30 days, later, without a date, done), each with its date as a
 * block, and the entry as a sheet beside it (`:id`). The status filter lives in
 * `?status=`; the page loads every entry once and filters here, so a filter shows at once.
 */
@Component({
  selector: 'app-maintenance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    TranslatePipe,
    FabComponent,
    PageHeaderComponent,
    ConfirmDialogComponent,
    DateBlockComponent,
    EmptyStateComponent,
    FilterSelectComponent,
    ListDetailLayoutComponent,
    ListItemComponent,
    NoteComponent,
    RowMenuComponent,
    ScrollFadeDirective,
    SkeletonComponent,
    StatusTextComponent,
    StickyBarComponent,
    MaintenancePlanDialogComponent,
  ],
  providers: [
    { provide: LIST_PAGE_STATE, useExisting: forwardRef(() => MaintenanceComponent) },
    { provide: MAINTENANCE_PAGE, useExisting: forwardRef(() => MaintenanceComponent) },
  ],
  host: { '[class.pane-page]': 'split()' },
  templateUrl: './maintenance.component.html',
  styleUrl: './maintenance.component.scss',
})
export class MaintenanceComponent implements MaintenancePage {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);
  private readonly editor = inject(EditDrawerService);

  private readonly layout = viewChild(ListDetailLayoutComponent);
  private readonly panes = injectListDetailPage(this.layout);
  readonly selectedId = this.panes.selectedId;
  readonly split = this.panes.split;

  /** Query `status`: scheduled (default), completed or both. */
  readonly status = input<string | undefined>();

  readonly entries = signal<MaintenanceEntryWithDetails[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly hasRows = computed(() => this.entries().length > 0);
  readonly deleting = signal<MaintenanceEntryWithDetails | null>(null);
  readonly busy = signal(false);
  readonly planning = signal(false);

  readonly filter = computed<StatusFilter>(() => {
    const s = this.status();
    return s === 'completed' || s === 'both' ? s : 'scheduled';
  });

  readonly filterOptions = computed<FilterSelectOption[]>(() => [
    { value: 'scheduled', label: this.i18n.translate('maint.open') },
    { value: 'completed', label: this.i18n.translate('maint.done') },
    { value: 'both', label: this.i18n.translate('maint.all') },
  ]);
  readonly filterText = computed(
    () => this.filterOptions().find((o) => o.value === this.filter())?.label ?? '',
  );

  /** The groups that have rows under the filter, each sorted by its date. */
  readonly groups = computed(() => {
    const f = this.filter();
    const time = (v: string | Date) => apiDate(v)?.getTime() ?? 0;
    const by = new Map<MaintGroup, MaintenanceEntryWithDetails[]>();
    for (const e of this.entries()) {
      const g = groupOf(e);
      if (f === 'scheduled' && g === 'done') continue;
      if (f === 'completed' && g !== 'done') continue;
      by.set(g, [...(by.get(g) ?? []), e]);
    }
    const order: MaintGroup[] = ['over', 'soon', 'later', 'undated', 'done'];
    return order
      .filter((g) => by.has(g))
      .map((g) => ({
        key: g,
        title: GROUP_TITLES[g],
        rows: by
          .get(g)!
          .sort((a, b) =>
            g === 'done'
              ? time(b.completedDate) - time(a.completedDate)
              : time(a.scheduledDate) - time(b.scheduledDate),
          ),
      }));
  });

  readonly isDone = isDone;
  readonly daysOverdue = daysOverdue;

  constructor() {
    this.load();
    this.editor.maintenanceSaved.pipe(takeUntilDestroyed()).subscribe(() => this.load());
  }

  reload(): void {
    this.load();
  }

  load(): void {
    this.error.set(false);
    this.api.maintenanceAll('both').subscribe({
      next: (entries) => {
        this.entries.set(entries ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  setFilter(value: string): void {
    void this.router.navigate([], {
      queryParams: { status: value === 'scheduled' || !value ? null : value },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** The text at the end of a row: how late a due entry is. */
  lateText(e: MaintenanceEntryWithDetails): string {
    const days = daysOverdue(e);
    return days === 1
      ? this.i18n.translate('maint.lateOne')
      : this.i18n.translate('maint.late', { days });
  }

  menu(e: MaintenanceEntryWithDetails): RowMenuSection[] {
    return [
      {
        items: [
          ...(isDone(e)
            ? []
            : [{ id: 'done', label: this.i18n.translate('maint.markDone'), icon: 'check' as const }]),
          { id: 'edit', label: this.i18n.translate('common.edit'), icon: 'edit' },
          { id: 'item', label: this.i18n.translate('maint.openItem'), icon: 'package' },
        ],
      },
      {
        items: [
          { id: 'delete', label: this.i18n.translate('common.delete'), icon: 'trash', danger: true },
        ],
      },
    ];
  }

  onMenu(e: MaintenanceEntryWithDetails, item: RowMenuItem): void {
    switch (item.id) {
      case 'done':
        this.markDone(e);
        break;
      case 'edit':
        this.editor.openMaintenance(e);
        break;
      case 'item':
        void this.router.navigate(['/items', e.itemID]);
        break;
      case 'delete':
        this.askDelete(e);
        break;
    }
  }

  markDone(e: MaintenanceEntryWithDetails): void {
    const completedDate = today();
    this.api
      .updateMaintenance(e.id, {
        name: e.name,
        cost: e.cost || '0',
        description: e.description,
        scheduledDate: apiDate(e.scheduledDate) ? e.scheduledDate : '',
        completedDate,
      })
      .subscribe({
        next: () => {
          this.entries.update((all) =>
            all.map((x) => (x.id === e.id ? { ...x, completedDate } : x)),
          );
          this.toast.show(this.i18n.translate('maint.markedDone', { name: e.name }), 'success');
          this.load();
        },
        error: (err) =>
          this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger'),
      });
  }

  askDelete(e: MaintenanceEntryWithDetails): void {
    this.deleting.set(e);
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
        if (this.selectedId() === e.id) this.closeDetail();
      },
      error: (err) => {
        this.busy.set(false);
        this.deleting.set(null);
        this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger');
      },
    });
  }

  onPlanned(id: string): void {
    this.planning.set(false);
    this.load();
    void this.router.navigate(['/maintenance', id], { queryParamsHandling: 'preserve' });
  }

  /** "Zur Liste" (one pane at a time). */
  closeDetail(): void {
    void this.router.navigate(['/maintenance'], { queryParamsHandling: 'preserve' });
  }
}
