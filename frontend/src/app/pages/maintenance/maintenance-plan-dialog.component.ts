import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient } from '@core/api/api-client.service';
import type { EntitySummary } from '@core/api/models';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { errorMessage } from '@shared/http-error';
import {
  AutocompleteComponent,
  ButtonComponent,
  DatepickerComponent,
  DialogComponent,
  InputComponent,
  NoteComponent,
  TextareaComponent,
} from '@stupa-makers/ui-kit';
import { Subject, debounceTime, switchMap } from 'rxjs';
import { today } from './maintenance-page';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * "Wartung planen" of the maintenance page: the item (searched as you type), the name, the
 * planned date (today unless changed) and a note. Emits the id of the new entry.
 */
@Component({
  selector: 'app-maintenance-plan-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    AutocompleteComponent,
    ButtonComponent,
    DatepickerComponent,
    DialogComponent,
    InputComponent,
    NoteComponent,
    TextareaComponent,
  ],
  template: `
    <app-dialog
      [open]="open()"
      size="form"
      [title]="'maint.plan' | t"
      [closeLabel]="'common.close' | t"
      (closed)="closed.emit()"
    >
      <form class="form-stack" (ngSubmit)="save()" novalidate>
        <app-autocomplete
          inputId="mp-item"
          [label]="'maint.item' | t"
          [placeholder]="'maint.itemSearch' | t"
          [query]="query()"
          [options]="hits()"
          [open]="!item() && hits().length > 0"
          [picked]="item()?.name ?? null"
          [clearLabel]="'common.clear' | t"
          [optionLabel]="itemLabel"
          (queryChange)="search($event)"
          (choose)="item.set($event)"
          (cleared)="item.set(null)"
        />
        <app-input name="name" [label]="'field.name' | t" [required]="true" [(ngModel)]="name" />
        <app-datepicker
          name="scheduled"
          [label]="'maint.scheduledDate' | t"
          [required]="true"
          [(ngModel)]="scheduledDate"
        />
        <app-textarea [label]="'maint.note' | t">
          <textarea name="description" rows="3" [(ngModel)]="description"></textarea>
        </app-textarea>
        @if (error()) {
          <app-note kind="error" icon="alert">{{ error() }}</app-note>
        }
      </form>
      <div dialog-footer>
        <app-button variant="text" (click)="closed.emit()">{{ 'common.cancel' | t }}</app-button>
        <app-button [loading]="busy()" (click)="save()">{{ 'maint.planSave' | t }}</app-button>
      </div>
    </app-dialog>
  `,
})
export class MaintenancePlanDialogComponent {
  private readonly api = inject(ApiClient);
  private readonly i18n = inject(I18nService);

  readonly open = input(false);
  readonly closed = output<void>();
  readonly planned = output<string>();

  readonly query = signal('');
  readonly hits = signal<EntitySummary[]>([]);
  readonly item = signal<EntitySummary | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  name = '';
  scheduledDate = '';
  description = '';

  private readonly searches = new Subject<string>();

  readonly itemLabel = (e: EntitySummary) => (e.parent ? `${e.name} · ${e.parent.name}` : e.name);

  constructor() {
    this.searches
      .pipe(
        debounceTime(200),
        switchMap((q) => this.api.entities({ q, pageSize: 8 })),
        takeUntilDestroyed(),
      )
      .subscribe({ next: (res) => this.hits.set(res.items ?? []), error: () => this.hits.set([]) });
    effect(() => {
      if (!this.open()) return;
      this.query.set('');
      this.hits.set([]);
      this.item.set(null);
      this.error.set(null);
      this.name = '';
      this.scheduledDate = today();
      this.description = '';
    });
  }

  search(q: string): void {
    this.query.set(q);
    this.item.set(null);
    if (q.trim()) this.searches.next(q.trim());
    else this.hits.set([]);
  }

  save(): void {
    const item = this.item();
    if (!item) return this.error.set(this.i18n.translate('maint.itemRequired'));
    if (!this.name.trim()) return this.error.set(this.i18n.translate('create.error.name'));
    // The server takes an entry only with a date; a plan is its planned date.
    if (!this.scheduledDate) return this.error.set(this.i18n.translate('maint.dateRequired'));
    this.busy.set(true);
    this.error.set(null);
    this.api
      .createMaintenance(item.id, {
        name: this.name.trim(),
        description: this.description,
        cost: '0',
        scheduledDate: this.scheduledDate,
        completedDate: '',
      })
      .subscribe({
        next: (entry) => {
          this.busy.set(false);
          this.planned.emit(entry.id);
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(errorMessage(err, this.i18n.translate('common.error')));
        },
      });
  }
}
