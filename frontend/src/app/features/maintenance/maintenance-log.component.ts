import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient } from '@core/api/api-client.service';
import type { MaintenanceEntryWithDetails } from '@core/api/models';
import { I18nService } from '@core/i18n/i18n.service';
import { LocalizedDatePipe, apiDate } from '@core/i18n/localized-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { errorMessage } from '@shared/http-error';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import {
  ButtonComponent,
  ConfirmDialogComponent,
  DatepickerComponent,
  DialogComponent,
  IconComponent,
  InputComponent,
  NoteComponent,
  RowMenuComponent,
  type RowMenuItem,
  type RowMenuSection,
  TextareaComponent,
  ToastService,
} from '@stupa-makers/ui-kit';

/** The date part of an API date for the datepicker (`YYYY-MM-DD`), `''` when unset. */
function toIsoDay(value: string | Date | null | undefined): string {
  const d = apiDate(value);
  if (!d) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * The maintenance log of one entity: the planned and the done entries, with the total
 * cost, and a dialog to add or edit an entry (name, planned date, done date, cost,
 * description).
 */
@Component({
  selector: 'app-maintenance-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    LocalizedDatePipe,
    MoneyPipe,
    ButtonComponent,
    IconComponent,
    DialogComponent,
    ConfirmDialogComponent,
    InputComponent,
    DatepickerComponent,
    TextareaComponent,
    NoteComponent,
    RowMenuComponent,
  ],
  templateUrl: './maintenance-log.component.html',
  styleUrl: './maintenance-log.component.scss',
})
export class MaintenanceLogComponent {
  private readonly api = inject(ApiClient);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);

  readonly entityId = input.required<string>();

  readonly entries = signal<MaintenanceEntryWithDetails[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly totalCost = computed(() =>
    this.entries().reduce((sum, e) => sum + (Number.parseFloat(e.cost) || 0), 0),
  );
  readonly scheduled = computed(() => this.entries().filter((e) => !apiDate(e.completedDate)));
  readonly done = computed(() => this.entries().filter((e) => !!apiDate(e.completedDate)));

  // Dialog state.
  readonly editing = signal<MaintenanceEntryWithDetails | 'new' | null>(null);
  readonly deleting = signal<MaintenanceEntryWithDetails | null>(null);
  readonly busy = signal(false);
  readonly formError = signal<string | null>(null);
  name = '';
  cost = '';
  description = '';
  scheduledDate = '';
  completedDate = '';

  readonly menu = computed<RowMenuSection[]>(() => [
    {
      items: [
        { id: 'edit', label: this.i18n.translate('common.edit'), icon: 'edit' },
        { id: 'delete', label: this.i18n.translate('common.delete'), icon: 'trash', danger: true },
      ],
    },
  ]);

  constructor() {
    effect(() => this.load(this.entityId()));
  }

  load(id = this.entityId()): void {
    this.error.set(false);
    this.api.maintenanceLog(id).subscribe({
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

  openNew(): void {
    this.name = '';
    this.cost = '';
    this.description = '';
    this.scheduledDate = '';
    this.completedDate = toIsoDay(new Date());
    this.formError.set(null);
    this.editing.set('new');
  }

  onMenu(entry: MaintenanceEntryWithDetails, item: RowMenuItem): void {
    if (item.id === 'delete') {
      this.deleting.set(entry);
      return;
    }
    this.name = entry.name;
    this.cost = entry.cost === '0' ? '' : entry.cost;
    this.description = entry.description;
    this.scheduledDate = toIsoDay(entry.scheduledDate);
    this.completedDate = toIsoDay(entry.completedDate);
    this.formError.set(null);
    this.editing.set(entry);
  }

  save(): void {
    const target = this.editing();
    if (!target || this.busy()) return;
    if (!this.name.trim()) {
      this.formError.set(this.i18n.translate('create.error.name'));
      return;
    }
    const body = {
      name: this.name.trim(),
      cost: this.cost || '0',
      description: this.description,
      scheduledDate: this.scheduledDate || '',
      completedDate: this.completedDate || '',
    };
    this.busy.set(true);
    const call =
      target === 'new'
        ? this.api.createMaintenance(this.entityId(), body)
        : this.api.updateMaintenance(target.id, body);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.editing.set(null);
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.formError.set(errorMessage(err, this.i18n.translate('common.error')));
      },
    });
  }

  confirmDelete(): void {
    const entry = this.deleting();
    if (!entry) return;
    this.busy.set(true);
    this.api.deleteMaintenance(entry.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.deleting.set(null);
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.deleting.set(null);
        this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger');
      },
    });
  }

  costOf(entry: MaintenanceEntryWithDetails): number {
    return Number.parseFloat(entry.cost) || 0;
  }
}
