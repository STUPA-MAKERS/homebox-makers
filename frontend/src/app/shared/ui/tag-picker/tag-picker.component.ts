import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { RefDataService } from '@core/data/ref-data.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import {
  ChipComponent,
  FilterSelectComponent,
  type FilterSelectOption,
} from '@stupa-makers/ui-kit';

/**
 * Pick tags of the collection: the chosen tags as removable chips, then a dashed "+ Tag"
 * chip that opens the list with several choices.
 */
@Component({
  selector: 'app-tag-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, ChipComponent, FilterSelectComponent],
  template: `
    <div class="tp" role="group" [attr.aria-label]="label() || ('tags.label' | t)">
      @for (tag of chosen(); track tag.id) {
        <app-chip
          [removable]="true"
          [removeLabel]="'tags.remove' | t: { name: tag.name }"
          (remove)="remove(tag.id)"
          >{{ tag.name }}</app-chip
        >
      }
      <app-filter-select
        class="tag-add"
        [label]="'tags.add' | t"
        [options]="options()"
        [multiple]="true"
        [(values)]="value"
        [text]="'tags.addShort' | t"
        [chevron]="false"
        [emptyText]="'tags.none' | t"
      />
    </div>
  `,
  styles: `
    .tp {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
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
  remove(id: string): void {
    this.value.update((v) => v.filter((x) => x !== id));
  }
}
