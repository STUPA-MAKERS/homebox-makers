import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { ApiClient } from '@core/api/api-client.service';
import type { EntityOut } from '@core/api/models';
import { RefDataService } from '@core/data/ref-data.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { errorMessage } from '@shared/http-error';
import {
  FilterSelectComponent,
  type FilterSelectOption,
  ToastService,
} from '@stupa-makers/ui-kit';

/**
 * Assign the tags of an item or a location right on its sheet: a dashed "+ Tag" chip after
 * the tags opens the list of all tags, where a click toggles one. The change shows at once and is saved a
 * moment after the last click, so a few clicks in a row make one request.
 */
@Component({
  selector: 'app-tag-assign',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, FilterSelectComponent],
  template: `
    <app-filter-select
      class="tag-add"
      [label]="'tags.add' | t"
      [options]="options()"
      [multiple]="true"
      [values]="ids()"
      (valuesChange)="change($event)"
      [text]="'tags.addShort' | t"
      [chevron]="false"
      [emptyText]="'tags.none' | t"
      (opened)="ref.ensureLoaded().subscribe()"
    />
  `,
})
export class TagAssignComponent {
  private readonly api = inject(ApiClient);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);
  protected readonly ref = inject(RefDataService);

  readonly entity = input.required<EntityOut>();
  /** The entity with its new tags: first the local change, then the saved answer. */
  readonly changed = output<EntityOut>();

  protected readonly ids = computed(() => this.entity().tags.map((t) => t.id));
  protected readonly options = computed<FilterSelectOption[]>(() =>
    this.ref.tags().map((t) => ({ value: t.id, label: t.name })),
  );

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.ref.ensureLoaded().subscribe();
    inject(DestroyRef).onDestroy(() => this.flush());
  }

  protected change(ids: readonly string[]): void {
    const byId = new Map(this.ref.tags().map((t) => [t.id, t]));
    const tags = ids.map((id) => byId.get(id)).filter((t) => !!t);
    this.changed.emit({ ...this.entity(), tags });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 600);
  }

  private flush(): void {
    if (!this.timer) return;
    clearTimeout(this.timer);
    this.timer = null;
    const current = this.entity();
    this.api
      .patchEntity(current.id, { id: current.id, tagIds: current.tags.map((t) => t.id) })
      .subscribe({
        next: (saved) => this.changed.emit(saved),
        error: (err) =>
          this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger'),
      });
  }
}
