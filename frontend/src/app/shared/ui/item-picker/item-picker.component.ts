import { ChangeDetectionStrategy, Component, inject, input, model, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiClient } from '@core/api/api-client.service';
import type { EntitySummary } from '@core/api/models';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AutocompleteComponent } from '@stupa-makers/ui-kit';
import { Subject, debounceTime, switchMap } from 'rxjs';

let nextId = 0;

/**
 * An item, searched as you type (`app-autocomplete` over the items of the collection):
 * the item of a new maintenance entry, the parent item of a sub-item. `exclude` leaves an
 * item out of the hits (the item itself, as its own parent).
 */
@Component({
  selector: 'app-item-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, AutocompleteComponent],
  template: `
    <app-autocomplete
      [inputId]="inputId"
      [label]="label()"
      [placeholder]="placeholder() || ('maint.itemSearch' | t)"
      [query]="query()"
      [options]="hits()"
      [open]="!value() && hits().length > 0"
      [picked]="value()?.name ?? null"
      [clearLabel]="'common.clear' | t"
      [optionLabel]="itemLabel"
      (queryChange)="search($event)"
      (choose)="value.set($event)"
      (cleared)="clear()"
    />
  `,
})
export class ItemPickerComponent {
  private readonly api = inject(ApiClient);

  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly exclude = input<string | null>(null);
  readonly value = model<EntitySummary | null>(null);

  protected readonly inputId = `app-item-picker-${nextId++}`;
  protected readonly query = signal('');
  protected readonly hits = signal<EntitySummary[]>([]);
  private readonly searches = new Subject<string>();

  protected readonly itemLabel = (e: EntitySummary) =>
    e.parent ? `${e.name} · ${e.parent.name}` : e.name;

  constructor() {
    this.searches
      .pipe(
        debounceTime(200),
        switchMap((q) => this.api.entities({ q, pageSize: 8 })),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (res) => this.hits.set((res.items ?? []).filter((e) => e.id !== this.exclude())),
        error: () => this.hits.set([]),
      });
  }

  protected search(q: string): void {
    this.query.set(q);
    this.value.set(null);
    if (q.trim()) this.searches.next(q.trim());
    else this.hits.set([]);
  }

  protected clear(): void {
    this.query.set('');
    this.hits.set([]);
    this.value.set(null);
  }
}
