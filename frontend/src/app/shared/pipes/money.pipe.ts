import { Pipe, type PipeTransform, inject } from '@angular/core';
import { CollectionService } from '@core/collection/collection.service';
import { I18nService } from '@core/i18n/i18n.service';

/** An amount in `currency`, formatted for `locale`. An unknown currency code falls back to EUR. */
export function formatMoney(value: number, locale: string, currency: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  } catch {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(value);
  }
}

/** `{{ item.purchasePrice | money }}`: the currency of the selected collection. */
@Pipe({ name: 'money', standalone: true, pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);
  private readonly collections = inject(CollectionService);

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '';
    return formatMoney(value, this.i18n.formatLocale(), this.collections.currency());
  }
}
