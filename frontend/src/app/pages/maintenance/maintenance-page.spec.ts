import type { MaintenanceEntryWithDetails } from '@core/api/models';
import { groupOf } from './maintenance-page';

const ZERO = '0001-01-01T00:00:00Z';

/** A date `days` from today, as the API sends it. */
function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T00:00:00Z`;
}

function entry(scheduledDate: string, completedDate = ZERO): MaintenanceEntryWithDetails {
  return { scheduledDate, completedDate } as MaintenanceEntryWithDetails;
}

/** §F/maintenance/list/000056 */
describe('groupOf', () => {
  it('puts a planned entry into its due group', () => {
    expect(groupOf(entry(inDays(-1)))).toBe('over');
    expect(groupOf(entry(inDays(1)))).toBe('soon');
    expect(groupOf(entry(inDays(30)))).toBe('soon');
    expect(groupOf(entry(inDays(31)))).toBe('later');
    expect(groupOf(entry(ZERO))).toBe('undated');
  });

  it('puts an entry with a completed date into done', () => {
    expect(groupOf(entry(inDays(-10), inDays(-1)))).toBe('done');
  });
});
