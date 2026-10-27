import { type HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '@core/api/api.config';
import { CollectionService } from '@core/collection/collection.service';
import { AuthService } from './auth.service';

/** The 403 body of a tenant the user no longer belongs to. */
const TENANT_DENIED = 'user does not have access to the requested tenant';

/**
 * Session handling of the API responses.
 *
 * - 401 on a signed-in route: the session ended (logout elsewhere, expiry). The app forgets
 *   it and opens the login page with the current URL as redirect. The login call itself is
 *   exempt, its 401 is a wrong password.
 * - 403 for a tenant the user lost: the stored collection is dropped, so the next request
 *   falls back to the default group.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(API_BASE_URL);
  const auth = inject(AuthService);
  const router = inject(Router);
  const collections = inject(CollectionService);
  if (!req.url.startsWith(base)) return next(req);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.endsWith('/users/login') && auth.isAuthenticated()) {
        auth.invalidate();
        void router.navigate(['/login'], { queryParams: { redirect: router.url } });
      } else if (err.status === 403 && err.error?.error === TENANT_DENIED) {
        collections.select(null);
      }
      return throwError(() => err);
    }),
  );
};
