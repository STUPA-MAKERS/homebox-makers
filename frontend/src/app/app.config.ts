import {
  type ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from '@core/auth/auth.interceptor';
import { AuthService } from '@core/auth/auth.service';
import { tenantInterceptor } from '@core/collection/tenant.interceptor';
import { I18nService } from '@core/i18n/i18n.service';
import type { TranslationKey } from '@core/i18n/translations';
import { appUiKitIntl } from '@core/i18n/ui-kit-intl';
import { AppTitleStrategy } from '@core/title/title.strategy';
import { ThemeService, loadingInterceptor, provideUiKit } from '@stupa-makers/ui-kit';
import {
  LIST_NONE_TEXT,
  provideRouteMotion,
  watchUAVisualTransitions,
} from '@stupa-makers/ui-kit/shell';
import { IS_INSTALLED_APP, SwUpdateService, lockInstalledAppZoom } from '@stupa-makers/ui-kit/pwa';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';

/**
 * The root providers of the app.
 *
 * Interceptor order: loading (outermost, measures the full duration) → tenant (adds
 * `X-Tenant`) → auth (401 and lost-tenant handling). The kit reads the locale and the
 * texts of the app through the `intl` factory of `provideUiKit`, and its `LoadingService`
 * counts the reads for the load bar. The route data of the empty list details holds catalog
 * keys, which `LIST_NONE_TEXT` translates. The app initializer waits for the catalog of the
 * active locale and for the session, so the first paint is in the right language and frame.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      provideRouteMotion(),
    ),
    { provide: TitleStrategy, useExisting: AppTitleStrategy },
    provideHttpClient(withInterceptors([loadingInterceptor, tenantInterceptor, authInterceptor])),
    provideUiKit({
      theme: {
        storageKey: 'hb.theme',
        manifest: { light: 'manifest.webmanifest', dark: 'manifest-dark.webmanifest' },
      },
      intl: () => appUiKitIntl(inject(I18nService)),
    }),
    {
      provide: LIST_NONE_TEXT,
      useFactory: () => {
        const i18n = inject(I18nService);
        return (key: string) => i18n.translate(key as TranslationKey);
      },
    },
    provideAppInitializer(() => {
      inject(ThemeService).init();
      inject(SwUpdateService).init();
      lockInstalledAppZoom(inject(DOCUMENT), inject(IS_INSTALLED_APP)());
      watchUAVisualTransitions();
      const session = firstValueFrom(inject(AuthService).ensureLoaded());
      return Promise.all([inject(I18nService).ready(), session]).then(() => undefined);
    }),
    // The installed app (manifest.webmanifest): the worker (ngsw-config.json) caches the app
    // shell and the assets, not `/api`; SwUpdateService offers a reload in a toast.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
