import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { TagSummary } from '@core/api/models';

/** A tag as a small pill with its colour dot; a link to the tag unless `static`. */
@Component({
  selector: 'app-tag-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (static()) {
      <span class="tc">
        <span class="tc__dot" [style.background]="tag().color || null"></span>{{ tag().name }}
      </span>
    } @else {
      <a class="tc tc--link" [routerLink]="['/tags', tag().id]">
        <span class="tc__dot" [style.background]="tag().color || null"></span>{{ tag().name }}
      </a>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      min-width: 0;
    }
    .tc {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      max-width: 100%;
      height: 26px;
      padding: 0 10px;
      border-radius: 13px;
      background: var(--color-surface-3);
      color: var(--color-text);
      font-size: var(--fs-small);
      font-weight: var(--fw-medium);
      white-space: nowrap;
      text-decoration: none;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tc--link:hover {
      background: var(--color-surface-4);
    }
    .tc--link:focus-visible {
      outline: 2px solid var(--color-focus-ring);
      outline-offset: 2px;
    }
    .tc__dot {
      flex: none;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-accent);
    }
  `,
})
export class TagChipComponent {
  readonly tag = input.required<Pick<TagSummary, 'id' | 'name' | 'color'>>();
  readonly static = input(false);
}
