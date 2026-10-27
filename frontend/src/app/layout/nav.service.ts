import { Injectable } from '@angular/core';
import type { IconName } from '@stupa-makers/ui-kit';
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
  { key: 'items', path: '/items', icon: 'box', labelKey: 'nav.items', place: 'main' },
  { key: 'locations', path: '/locations', icon: 'building', labelKey: 'nav.locations', place: 'main' },
  { key: 'tags', path: '/tags', icon: 'tag', labelKey: 'nav.tags', place: 'main' },
  { key: 'collection', path: '/collection', icon: 'users', labelKey: 'nav.collection', place: 'end' },
];

/** The entries of the phone bottom bar, in bar order. The rest goes into "Mehr". */
export const BOTTOM_BAR_KEYS: readonly string[] = ['home', 'items', 'locations', 'tags'];

/**
 * The areas of the app, shared by the rail and the bottom bar. Homebox has no per-area
 * permissions: every member of a collection may open every area.
 */
@Injectable({ providedIn: 'root' })
export class NavService {
  readonly items = ITEMS;
}
