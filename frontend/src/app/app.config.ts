import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from '@core/auth/auth.interceptor';
import { AuthService } from '@core/auth/auth.service';
import { tenantInterceptor } from '@core/collection/tenant.interceptor';
import { I18nService } from '@core/i18n/i18n.service';
import { onRouteViewTransition, watchUAVisualTransitions } from '@core/motion/motion';
import { loadingInterceptor } from '@core/loading/loading.interceptor';
import { LoadingService } from '@core/loading/loading.service';
import { ThemeService } from '@core/theme/theme.service';
import { AppTitleStrategy } from '@core/title/title.strategy';
import { UI_KIT_INTL, UI_KIT_LOADING, uiKitIntlFromLang } from '@stupa-makers/ui-kit';
import { routes } from './app.routes';

/**
 * The root providers of the app.
 *
 * Interceptor order: loading (outermost, measures the full duration) → tenant (adds
 * `X-Tenant`) → auth (401 and lost-tenant handling). The kit reads the locale and the loading
 * state of the app through its tokens. The app initializer waits for the catalog of the
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
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: onRouteViewTransition,
      }),
    ),
    { provide: TitleStrategy, useExisting: AppTitleStrategy },
    provideHttpClient(withInterceptors([loadingInterceptor, tenantInterceptor, authInterceptor])),
    {
      provide: UI_KIT_INTL,
      useFactory: () => {
        const i18n = inject(I18nService);
        return uiKitIntlFromLang(i18n.locale, undefined, i18n.formatLocale);
      },
    },
    { provide: UI_KIT_LOADING, useFactory: () => ({ visible: inject(LoadingService).visible }) },
    provideAppInitializer(() => {
      inject(ThemeService).init();
      watchUAVisualTransitions();
      const session = firstValueFrom(inject(AuthService).ensureLoaded());
      return Promise.all([inject(I18nService).ready(), session]).then(() => undefined);
    }),
  ],
};
