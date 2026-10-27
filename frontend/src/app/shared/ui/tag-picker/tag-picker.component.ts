import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { RefDataService } from '@core/data/ref-data.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import {
  ChipComponent,
  FilterSelectComponent,
  type FilterSelectOption,
} from '@stupa-makers/ui-kit';

/**
 * Pick tags of the collection: a chip opens the list with several choices, the chosen tags
 * show as removable chips below.
 */
@Component({
  selector: 'app-tag-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, ChipComponent, FilterSelectComponent],
  template: `
    <div class="tp">
      <app-filter-select
        [label]="label() || ('tags.label' | t)"
        icon="tag"
        [options]="options()"
        [multiple]="true"
        [(values)]="value"
        [text]="summary()"
        [emptyText]="'tags.none' | t"
        filled
      />
      @if (chosen().length) {
        <div class="tp__chips">
          @for (tag of chosen(); track tag.id) {
            <app-chip
              [removable]="true"
              [removeLabel]="'tags.remove' | t: { name: tag.name }"
              (remove)="remove(tag.id)"
              >{{ tag.name }}</app-chip
            >
          }
        </div>
      }
    </div>
  `,
  styles: `
    .tp {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-2);
    }
    .tp__chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
  `,
})
export class TagPickerComponent {
  private readonly ref = inject(RefDataService);

  readonly value = model<readonly string[]>([]);
  readonly label = input<string | null>(null);

  readonly options = computed<FilterSelectOption[]>(() =>
    this.ref.tags().map((t) => ({ value: t.id, label: t.name })),
  );
  readonly chosen = computed(() => {
    const ids = new Set(this.value());
    return this.ref.tags().filter((t) => ids.has(t.id));
  });
  readonly summary = computed(() => {
    const n = this.chosen().length;
    return n === 0 ? null : n === 1 ? this.chosen()[0].name : String(n);
  });

  remove(id: string): void {
    this.value.update((v) => v.filter((x) => x !== id));
  }
}
