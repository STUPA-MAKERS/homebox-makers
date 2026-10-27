/** UI string catalog. DE is the reference. A missing EN key falls back to DE. */

import deCatalog from './catalog/de.json';

export type Locale = 'de' | 'en';

export const SUPPORTED_LOCALES: readonly Locale[] = ['de', 'en'] as const;
export const DEFAULT_LOCALE: Locale = 'de';

/** The DE catalog (`catalog/de.json`), the reference for every key. */
export const de = deCatalog;

export type TranslationKey = keyof typeof de;

/** The shape of `I18nService.translate`, for pure helpers that take the translator as an argument. */
export type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

/**
 * The catalog of every locale. DE is bundled with the app, because it is the reference and
 * the fallback. EN starts empty and `loadCatalog` fills it from its lazy chunk.
 */
export const CATALOG: Record<Locale, Partial<Record<TranslationKey, string>>> = { de, en: {} };

const LOADED = new Set<Locale>(['de']);

/** Put the strings of `locale` into {@link CATALOG}. */
export function registerCatalog(
  locale: Locale,
  table: Partial<Record<TranslationKey, string>>,
): void {
  CATALOG[locale] = table;
  LOADED.add(locale);
}

/** Load the strings of `locale` from their lazy chunk. A loaded locale resolves at once. */
export async function loadCatalog(locale: Locale): Promise<void> {
  if (LOADED.has(locale)) return;
  const { en } = await import('./translations.en');
  registerCatalog('en', en);
}
