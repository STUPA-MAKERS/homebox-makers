import { Injectable, computed, inject } from '@angular/core';
import type { IconName } from '@stupa-makers/ui-kit';
import type { ShellNavItem } from '@stupa-makers/ui-kit/shell';
import { I18nService } from '@core/i18n/i18n.service';
import type { TranslationKey } from '@core/i18n/translations';

/** One area of the app navigation. */
export interface NavItem {
  key: string;
  path: string;
  icon: IconName;
  labelKey: TranslationKey;
  /** `main` sits in the upper group of the rail, `end` above the account. */
  place: 'main' | 'end';
  exact?: boolean;
}

const ITEMS: readonly NavItem[] = [
  { key: 'home', path: '/home', icon: 'home', labelKey: 'nav.home', place: 'main' },
  { key: 'items', path: '/items', icon: 'package', labelKey: 'nav.items', place: 'main' },
  { key: 'scan', path: '/scan', icon: 'scan', labelKey: 'nav.scan', place: 'main' },
  {
    key: 'locations',
    path: '/locations',
    icon: 'mappin',
    labelKey: 'nav.locations',
    place: 'main',
  },
  { key: 'tags', path: '/tags', icon: 'tag', labelKey: 'nav.tags', place: 'main' },
  {
    key: 'maintenance',
    path: '/maintenance',
    icon: 'wrench',
    labelKey: 'nav.maintenance',
    place: 'main',
  },
  {
    key: 'collection',
    path: '/collection',
    icon: 'gear',
    labelKey: 'nav.collection',
    place: 'end',
  },
];

/** The entries of the phone bottom bar, in bar order. The rest goes into "Mehr". */
export const BOTTOM_BAR_KEYS: readonly string[] = ['home', 'items', 'scan', 'tags'];

/**
 * The areas of the app, shared by the rail, the bottom bar and the search. Homebox has no
 * per-area permissions: every member of a collection may open every area.
 */
@Injectable({ providedIn: 'root' })
export class NavService {
  private readonly i18n = inject(I18nService);

  readonly items = ITEMS;

  /** The entries of the kit shell, with the labels in the active language. */
  readonly shellItems = computed<ShellNavItem[]>(() =>
    ITEMS.map((i) => ({
      key: i.key,
      path: i.path,
      label: this.i18n.translate(i.labelKey),
      icon: i.icon,
      place: i.place,
      exact: i.exact,
    })),
  );
}
