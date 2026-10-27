import { Injectable, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { type RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { I18nService } from '@core/i18n/i18n.service';
import type { TranslationKey } from '@core/i18n/translations';

/**
 * The document title: the route `data.title` (an i18n key), then "Homebox". A page that shows
 * a record (an item, a location) sets the name of the record with {@link setPageTitle}.
 */
@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly i18n = inject(I18nService);
  private readonly key = signal<TranslationKey | null>(null);
  private readonly custom = signal<string | null>(null);

  constructor() {
    super();
    effect(() => {
      const custom = this.custom();
      const key = this.key();
      const page = custom ?? (key ? this.i18n.translate(key) : null);
      this.title.setTitle(page ? `${page} · Homebox` : 'Homebox');
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    let route = snapshot.root;
    let key: TranslationKey | null = null;
    while (route) {
      key = (route.data['title'] as TranslationKey | undefined) ?? key;
      route = route.firstChild!;
    }
    this.custom.set(null);
    this.key.set(key);
  }

  /** The name of the record on screen, in place of the route title. */
  setPageTitle(text: string | null): void {
    this.custom.set(text);
  }
}
