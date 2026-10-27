import enCatalog from './catalog/en.json';
import type { TranslationKey } from './translations';

/**
 * The EN catalog (`catalog/en.json`). A missing key falls back to DE at runtime. A module of
 * its own, so the build puts it into a lazy chunk.
 */
export const en: Partial<Record<TranslationKey, string>> = enCatalog;
