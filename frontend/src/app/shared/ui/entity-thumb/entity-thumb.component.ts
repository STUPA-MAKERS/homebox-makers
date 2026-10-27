import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { EntitySummary } from '@core/api/models';
import { IconComponent } from '@stupa-makers/ui-kit';
import { injectAttachmentUrl, isLocation } from '@shared/entity.util';

/**
 * The square picture of an entity in a row or a card: its thumbnail, else its primary image,
 * else the icon of an item or a location on a tinted tile. A broken image falls back to the
 * icon.
 */
@Component({
  selector: 'app-entity-thumb',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { '[style.--thumb-size.px]': 'size()' },
  template: `
    @if (src(); as url) {
      <img class="th" [src]="url" alt="" loading="lazy" (error)="failed.set(true)" />
    } @else {
      <span class="th th--icon" aria-hidden="true">
        <app-icon [name]="location() ? 'building' : 'box'" [size]="size() / 2" />
      </span>
    }
  `,
  styles: `
    :host {
      display: block;
      flex: none;
      width: var(--thumb-size);
      height: var(--thumb-size);
    }
    .th {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: var(--radius-md);
      object-fit: cover;
      background: var(--color-surface-3);
    }
    .th--icon {
      display: grid;
      place-items: center;
      color: var(--color-accent-text);
      background: var(--color-selected);
    }
  `,
})
export class EntityThumbComponent {
  readonly entity =
    input.required<Pick<EntitySummary, 'id' | 'thumbnailId' | 'imageId' | 'entityType'>>();
  readonly size = input(40);

  private readonly url = injectAttachmentUrl();
  protected readonly failed = signal(false);
  protected readonly location = computed(() => isLocation(this.entity()));

  protected readonly src = computed(() => {
    const e = this.entity();
    const id = e.thumbnailId || e.imageId;
    return id && !this.failed() ? this.url(e.id, id) : null;
  });
}
