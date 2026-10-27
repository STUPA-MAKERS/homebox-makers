import { InjectionToken } from '@angular/core';

/** Prefix of every backend route. The Go server serves the SPA and the API from one origin. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api/v1',
});
