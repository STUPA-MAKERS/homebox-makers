import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { TagSummary } from '@core/api/models';
import { TagChipComponent } from './tag-chip.component';

/**
 * The tags of a list row: the first `max` as small static pills, the rest as "+N". The row
 * itself is the link, so the pills are not links of their own.
 */
@Component({
  selector: 'app-tag-strip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TagChipComponent],
  template: `
    @for (tag of shown(); track tag.id) {
      <app-tag-chip [tag]="tag" [static]="true" />
    }
    @if (rest(); as n) {
      <span class="ts__more" [attr.title]="restNames()">+{{ n }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-wrap: nowrap;
      align-items: center;
      gap: 4px;
      min-width: 0;
      max-width: 16rem;
      overflow: hidden;
    }
    :host ::ng-deep .tc {
      height: 22px;
      padding: 0 8px;
      font-size: var(--fs-xs, 0.75rem);
    }
    .ts__more {
      flex: none;
      color: var(--color-text-muted);
      font-size: var(--fs-small);
    }
  `,
})
export class TagStripComponent {
  readonly tags = input<readonly TagSummary[] | null | undefined>([]);
  readonly max = input(2);

  readonly shown = computed(() => (this.tags() ?? []).slice(0, this.max()));
  readonly rest = computed(() => Math.max(0, (this.tags() ?? []).length - this.max()));
  readonly restNames = computed(() =>
    (this.tags() ?? [])
      .slice(this.max())
      .map((t) => t.name)
      .join(', '),
  );
}
