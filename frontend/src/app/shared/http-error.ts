import { HttpErrorResponse } from '@angular/common/http';
import type { ApiErrorBody } from '@core/api/models';

/** The message of a failed request: the `error` text of the server, else `fallback`. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as ApiErrorBody | string | null;
    if (body && typeof body === 'object' && body.error) return body.error;
  }
  return fallback;
}
