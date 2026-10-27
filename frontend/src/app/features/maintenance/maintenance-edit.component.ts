import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient } from '@core/api/api-client.service';
import type { MaintenanceEntry, MaintenanceEntryWithDetails } from '@core/api/models';
import { I18nService } from '@core/i18n/i18n.service';
import { apiDate } from '@core/i18n/localized-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { errorMessage } from '@shared/http-error';
import { FabComponent } from '@shared/ui/fab/fab.component';
import {
  ButtonComponent,
  CurrencyInputComponent,
  DatepickerComponent,
  IconComponent,
  InputComponent,
  NoteComponent,
  SheetBarComponent,
  SheetBarTitleDirective,
  TextareaComponent,
} from '@stupa-makers/ui-kit';

/** The date part of an API date for the datepicker (`YYYY-MM-DD`), `''` when unset. */
function toIsoDay(value: string | Date | null | undefined): string {
  const d = apiDate(value);
  if (!d) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * The editor of a maintenance entry as the content of the edit side pane: name, the planned
 * and the done day, the cost and a note. Save is a floating button that shows after a
 * change.
 */
@Component({
  selector: 'app-maintenance-edit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    FabComponent,
    ButtonComponent,
    CurrencyInputComponent,
    DatepickerComponent,
    IconComponent,
    InputComponent,
    NoteComponent,
    SheetBarComponent,
    SheetBarTitleDirective,
    TextareaComponent,
  ],
  template: `
    <div class="me">
      <header class="sheet-head me__head">
        <app-sheet-bar [bleed]="true">
          <h2 appSheetBarTitle id="me-title" class="sheet-title">{{ 'maint.edit' | t }}</h2>
          <app-button
            variant="text"
            [iconOnly]="true"
            [ariaLabel]="'common.close' | t"
            (click)="done.emit(null)"
            ><app-icon name="x"
          /></app-button>
        </app-sheet-bar>
        <p class="sheet-line">{{ entry().itemName }}</p>
      </header>
      <form class="form-stack" (ngSubmit)="save()" novalidate>
        <app-input name="name" [label]="'field.name' | t" [required]="true" [(ngModel)]="name" />
        <div class="form-grid">
          <app-datepicker
            name="scheduled"
            [label]="'maint.scheduledDate' | t"
            [(ngModel)]="scheduledDate"
          />
          <app-datepicker
            name="completed"
            [label]="'maint.completedDate' | t"
            [(ngModel)]="completedDate"
          />
        </div>
        <app-currency-input name="cost" [label]="'maint.cost' | t" [(ngModel)]="cost" />
        <app-textarea [label]="'field.description' | t" [grow]="true">
          <textarea name="description" rows="4" [(ngModel)]="description"></textarea>
        </app-textarea>
        @if (error()) {
          <app-note kind="error" icon="alert">{{ error() }}</app-note>
        }
      </form>
      @if (dirty() || busy()) {
        <app-fab
          icon="check"
          animate.enter="motion-fade-in"
          [label]="'common.save' | t"
          [contained]="true"
          [loading]="busy()"
          (activate)="save()"
        />
      }
    </div>
  `,
  styles: `
    .me {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }
    .me__head {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--color-surface);
    }
  `,
})
export class MaintenanceEditComponent {
  private readonly api = inject(ApiClient);
  private readonly i18n = inject(I18nService);

  readonly entry = input.required<MaintenanceEntryWithDetails>();
  readonly done = output<MaintenanceEntry | null>();

  name = '';
  scheduledDate = '';
  completedDate = '';
  cost = '';
  description = '';
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  private pristine = '';

  constructor() {
    effect(() => {
      const e = this.entry();
      untracked(() => {
        this.name = e.name;
        this.scheduledDate = toIsoDay(e.scheduledDate);
        this.completedDate = toIsoDay(e.completedDate);
        this.cost = e.cost === '0' ? '' : e.cost;
        this.description = e.description;
        this.pristine = this.snapshot();
      });
    });
  }

  private snapshot(): string {
    return JSON.stringify([this.name, this.scheduledDate, this.completedDate, String(this.cost ?? ''), this.description]);
  }

  /** The save button shows only after a change. */
  dirty(): boolean {
    return !!this.pristine && this.snapshot() !== this.pristine;
  }

  save(): void {
    if (this.busy()) return;
    if (!this.name.trim()) {
      this.error.set(this.i18n.translate('create.error.name'));
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.api
      .updateMaintenance(this.entry().id, {
        name: this.name.trim(),
        cost: String(this.cost || '0'),
        description: this.description,
        scheduledDate: this.scheduledDate || '',
        completedDate: this.completedDate || '',
      })
      .subscribe({
        next: (saved) => {
          this.busy.set(false);
          this.done.emit(saved);
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(errorMessage(err, this.i18n.translate('common.error')));
        },
      });
  }
}
