import { type HttpInterceptorFn, HttpContext, HttpContextToken } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from './loading.service';

/** Per-request opt-out for the global loading bar. */
export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);

/** Ready-made {@link HttpContext} that suppresses the global loading bar. */
export function skipLoading(): HttpContext {
  return new HttpContext().set(SKIP_LOADING, true);
}

/**
 * Feeds the global loading bar through the {@link LoadingService}. Only GET requests count:
 * a mutation has local feedback (the `loading` state of its button) and must not flash the
 * page. A background read opts out with {@link SKIP_LOADING}.
 *
 * Register this as the outermost interceptor, so it measures the full request duration.
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET' || req.context.get(SKIP_LOADING)) return next(req);
  const loading = inject(LoadingService);
  loading.inc();
  return next(req).pipe(finalize(() => loading.dec()));
};
