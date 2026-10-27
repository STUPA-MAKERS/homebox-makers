import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiClient } from '@core/api/api-client.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { entityLink } from '@shared/entity.util';
import { ButtonLinkComponent, EmptyStateComponent, SkeletonComponent } from '@stupa-makers/ui-kit';

/**
 * `/a/:assetId`, the target of a printed asset label: looks the asset id up and opens the
 * entity. An unknown id says so.
 */
@Component({
  selector: 'app-asset-redirect',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, EmptyStateComponent, SkeletonComponent, ButtonLinkComponent],
  template: `
    <div class="page">
      @if (missing()) {
        <app-empty-state
          icon="search"
          [heading]="'asset.notFound' | t: { id: assetId() }"
          [body]="'asset.notFoundBody' | t"
        >
          <a appButton="tonal" routerLink="/items">{{ 'home.allItems' | t }}</a>
        </app-empty-state>
      } @else {
        <app-skeleton variant="panel" [label]="'common.loading' | t" />
      }
    </div>
  `,
})
export class AssetRedirectComponent {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);

  readonly assetId = input.required<string>();
  readonly missing = signal(false);

  constructor() {
    queueMicrotask(() =>
      this.api.assetLookup(this.assetId()).subscribe({
        next: (res) => {
          const hit = res.items?.[0];
          if (hit) void this.router.navigate(entityLink(hit), { replaceUrl: true });
          else this.missing.set(true);
        },
        error: () => this.missing.set(true),
      }),
    );
  }
}
