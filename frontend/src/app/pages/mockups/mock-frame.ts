import { DestroyRef, type Signal, computed, effect, inject } from '@angular/core';
import { ListDetailLayoutComponent } from '@stupa-makers/ui-kit';
import { PageFrameService } from '../../layout/page-frame.service';

/** The split state of a mockup with a list and a detail, like the real list pages. */
export function mockSplit(layout: Signal<ListDetailLayoutComponent | undefined>) {
  const frame = inject(PageFrameService);
  const split = computed(() => layout()?.collapsed() === false);
  effect(() => frame.fill.set(split()));
  inject(DestroyRef).onDestroy(() => frame.fill.set(false));
  return split;
}

/** A date `days` from today, for the sample data. */
export function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
