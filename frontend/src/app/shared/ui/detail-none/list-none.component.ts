import {
  ChangeDetectionStrategy,
  Component,
  InjectionToken,
  type Signal,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import type { TranslationKey } from '@core/i18n/translations';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import type { IconName } from '@stupa-makers/ui-kit';
import { DetailNoneComponent, type DetailNoneState } from './detail-none.component';

/** What a list page tells the empty detail beside it. */
export interface ListPageState {
  readonly loading: Signal<boolean>;
  readonly error: Signal<boolean>;
  readonly hasRows: Signal<boolean>;
}

/** Provided by a list page with a detail outlet (`useExisting` the page). */
export const LIST_PAGE_STATE = new InjectionToken<ListPageState>('LIST_PAGE_STATE');

/** The route data of the empty child route of a list page. */
export interface ListNoneData {
  icon: IconName;
  heading: TranslationKey;
  emptyHeading: TranslationKey;
  emptyBody?: TranslationKey;
}

/**
 * The detail pane of a list page before a row is open (`path: ''` child, with
 * `data: { none: ListNoneData }`). Only the side-by-side layout shows it. While the list
 * loads or after an error it shows only the empty sheet: the list pane says what happens.
 */
@Component({
  selector: 'app-list-none',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, DetailNoneComponent],
  template: `
    @if (data().none; as d) {
      <app-detail-none
        [state]="state()"
        [icon]="d.icon"
        [heading]="d.heading | t"
        [emptyHeading]="d.emptyHeading | t"
        [emptyBody]="d.emptyBody ? (d.emptyBody | t) : null"
      />
    }
  `,
  styleUrl: './detail-none-host.scss',
})
export class ListNoneComponent {
  private readonly page = inject(LIST_PAGE_STATE, { optional: true });
  private readonly route = inject(ActivatedRoute);

  protected readonly data = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  }) as unknown as Signal<{ none?: ListNoneData }>;

  protected readonly state = computed<DetailNoneState>(() => {
    const page = this.page;
    if (!page || page.loading() || page.error()) return 'busy';
    return page.hasRows() ? 'pick' : 'empty';
  });
}
