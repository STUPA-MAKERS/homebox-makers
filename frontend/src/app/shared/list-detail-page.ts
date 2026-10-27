import { DestroyRef, type Signal, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import type { ListDetailLayoutComponent } from '@stupa-makers/ui-kit';
import { filter } from 'rxjs';
import { PageFrameService } from '../layout/page-frame.service';

/** The state a list page with a detail outlet (`app-list-detail`) shares with its panes. */
export interface ListDetailPage {
  /** The `:id` of the open child route, `null` while no row is open. */
  readonly selectedId: Signal<string | null>;
  /** The list and the detail sit side by side. */
  readonly split: Signal<boolean>;
}

/**
 * Wires a list page to its `app-list-detail` (call in an injection context): reads the id
 * of the open row from the child route after every navigation, and lets the page fill the
 * viewport while the panes sit side by side, so only the panes scroll.
 */
export function injectListDetailPage(
  layout: Signal<ListDetailLayoutComponent | undefined>,
): ListDetailPage {
  const router = inject(Router);
  const route = inject(ActivatedRoute);
  const frame = inject(PageFrameService);

  const selectedId = signal<string | null>(null);
  const read = () => selectedId.set(route.snapshot.firstChild?.paramMap.get('id') ?? null);
  read();
  router.events
    .pipe(
      filter((e) => e instanceof NavigationEnd),
      takeUntilDestroyed(),
    )
    .subscribe(read);

  const split = computed(() => layout()?.collapsed() === false);
  effect(() => frame.fill.set(split()));
  inject(DestroyRef).onDestroy(() => frame.fill.set(false));

  return { selectedId: selectedId.asReadonly(), split };
}
