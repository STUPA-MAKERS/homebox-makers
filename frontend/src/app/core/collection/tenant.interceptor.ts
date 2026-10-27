import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '@core/api/api.config';
import { CollectionService } from './collection.service';

/**
 * Adds `X-Tenant` with the selected collection to every API request. A request that sets
 * the header itself (an action on another collection) keeps its own value.
 */
export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(API_BASE_URL);
  const tenant = inject(CollectionService).selectedId();
  if (!tenant || !req.url.startsWith(base) || req.headers.has('X-Tenant')) return next(req);
  return next(req.clone({ setHeaders: { 'X-Tenant': tenant } }));
};
