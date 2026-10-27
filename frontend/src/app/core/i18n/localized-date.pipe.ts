import { Pipe, type PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

/** Format presets for the localized date output. */
export type LocalDateFormat = 'short' | 'medium' | 'mediumDate' | 'long' | 'time';

const OPTIONS: Record<LocalDateFormat, Intl.DateTimeFormatOptions> = {
  short: { dateStyle: 'short', timeStyle: 'short' },
  medium: { dateStyle: 'medium', timeStyle: 'short' },
  mediumDate: { dateStyle: 'medium' },
  long: { dateStyle: 'long', timeStyle: 'short' },
  time: { timeStyle: 'short' },
};

/**
 * The parsed date of an API value, or `null` when it is unset. The backend writes an unset
 * date as the Go zero time (`0001-01-01T00:00:00Z`), so a year before 1000 counts as unset.
 */
export function apiDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() < 1000) return null;
  return date;
}

/** The localized text of a moment, `''` for no value. `locale` is `I18nService.formatLocale()`. */
export function formatMoment(
  value: string | number | Date | null | undefined,
  locale: string,
  format: LocalDateFormat = 'medium',
): string {
  const date = apiDate(value);
  return date ? new Intl.DateTimeFormat(locale, OPTIONS[format]).format(date) : '';
}

/**
 * Localized date and time output through `Intl.DateTimeFormat`. It follows the active UI
 * language, not the fixed Angular `LOCALE_ID`; impure, so a language switch applies at once.
 */
@Pipe({ name: 'ldate', standalone: true, pure: false })
export class LocalizedDatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(
    value: string | number | Date | null | undefined,
    format: LocalDateFormat = 'mediumDate',
  ): string {
    return formatMoment(value, this.i18n.formatLocale(), format);
  }
}
