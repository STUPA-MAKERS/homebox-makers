import { Injectable, computed, signal } from '@angular/core';
import {
  CATALOG,
  DEFAULT_LOCALE,
  type Locale,
  SUPPORTED_LOCALES,
  type TranslationKey,
  loadCatalog,
} from './translations';

const STORAGE_KEY = 'hb.locale';

/**
 * The `Intl` tag behind each UI locale. Bare `en` would format in US order (`07/01/2026`,
 * `7:50 PM`), so EN formats as `en-GB`. Every `Intl` call goes through
 * {@link I18nService.formatLocale}; never pass a bare UI locale to `Intl`.
 */
const FORMAT_LOCALES: Record<Locale, string> = { de: 'de-DE', en: 'en-GB' };

/**
 * UI i18n with the built-in DE and EN catalogs.
 *
 * The locale comes from the persisted choice, else the browser, else DE. A text comes from the
 * active locale, then DE; a key that neither has shows as itself.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly _locale = signal<Locale>(this.resolveInitialLocale());

  /** The active UI locale (`de` / `en`). Not for `Intl`, see {@link formatLocale}. */
  readonly locale = this._locale.asReadonly();

  /** `Intl` tag of the active locale (`de-DE` / `en-GB`). */
  readonly formatLocale = computed(() => FORMAT_LOCALES[this._locale()]);

  readonly locales = SUPPORTED_LOCALES;

  constructor() {
    document.documentElement.lang = this._locale();
  }

  /** Load the catalog of the active locale. The app initializer waits for it. */
  ready(): Promise<void> {
    return loadCatalog(this._locale()).catch(() => undefined);
  }

  setLocale(locale: Locale): void {
    if (!SUPPORTED_LOCALES.includes(locale)) return;
    void loadCatalog(locale)
      .catch(() => undefined)
      .then(() => {
        this._locale.set(locale);
        document.documentElement.lang = locale;
      });
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* Storage is blocked. Ignore the error. */
    }
  }

  /** Translate a key: the active locale, then DE, then the key itself. */
  translate(key: TranslationKey, params?: Record<string, string | number>): string {
    const raw = CATALOG[this._locale()][key] ?? CATALOG[DEFAULT_LOCALE][key] ?? key;
    return params ? this.interpolate(raw, params) : raw;
  }

  private interpolate(text: string, params: Record<string, string | number>): string {
    return text.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  }

  private resolveInitialLocale(): Locale {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'de' || stored === 'en') return stored;
    } catch {
      /* ignore */
    }
    const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : '';
    return nav === 'en' ? 'en' : DEFAULT_LOCALE;
  }
}
