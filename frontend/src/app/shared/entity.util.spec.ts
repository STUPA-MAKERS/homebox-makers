import { HttpErrorResponse } from '@angular/common/http';
import { apiDate } from '@core/i18n/localized-date.pipe';
import { entityLink, isLocation } from './entity.util';
import { errorMessage } from './http-error';

describe('entity utils', () => {
  const loc = { id: 'l1', entityType: { isLocation: true } } as never;
  const item = { id: 'i1', entityType: { isLocation: false } } as never;

  it('routes a location and an item to their pages', () => {
    expect(isLocation(loc)).toBe(true);
    expect(isLocation(item)).toBe(false);
    expect(entityLink(loc)).toEqual(['/locations', 'l1']);
    expect(entityLink(item)).toEqual(['/items', 'i1']);
  });

  it('treats the Go zero time as no date', () => {
    expect(apiDate('0001-01-01T00:00:00Z')).toBeNull();
    expect(apiDate('')).toBeNull();
    expect(apiDate('2024-05-01T00:00:00Z')?.getUTCFullYear()).toBe(2024);
  });

  it('prefers the error text of the server over the fallback', () => {
    expect(
      errorMessage(
        new HttpErrorResponse({ status: 400, error: { error: 'name taken' } }),
        'fallback',
      ),
    ).toBe('name taken');
    expect(errorMessage(new Error('x'), 'fallback')).toBe('fallback');
  });
});
