import type { UiKitIntl, UiKitTextKey } from '@stupa-makers/ui-kit';
import { uiKitIntlFromLang } from '@stupa-makers/ui-kit';
import type { I18nService } from './i18n.service';
import type { TranslationKey } from './translations';

/**
 * The texts of the kit shell that the app catalog already holds. The shell, the account
 * menu, the search palette and the update toast show the app wording through this map.
 * Every other kit text comes from the built-in DE/EN texts of the kit.
 */
const APP_KEYS: Partial<Record<UiKitTextKey, TranslationKey>> = {
  'shell.skip': 'app.skipToContent',
  'shell.mainNav': 'nav.main',
  'shell.more': 'shell.nav.more',
  'shell.search': 'nav.search',
  'shell.brand': 'shell.nav.brand',
  'account.signedInAs': 'auth.signedInAs',
  'account.language': 'shell.account.language',
  'account.darkMode': 'shell.account.darkMode',
  'account.logout': 'auth.logout',
  'account.open': 'shell.account.open',
  'account.region': 'shell.account.region',
  'palette.title': 'search.title',
  'palette.placeholder': 'search.placeholder',
  'palette.close': 'search.close',
  'palette.empty': 'search.empty',
  'palette.truncated': 'search.truncated',
  'palette.keysSelect': 'search.keys.select',
  'palette.keysOpen': 'search.keys.open',
  'palette.archived': 'search.archived',
  'pwa.updateReady': 'pwa.updateReady',
  'pwa.reload': 'pwa.reload',
};

/**
 * The `UI_KIT_INTL` of the app: the language and the `Intl` tag of {@link I18nService},
 * the app catalog for the keys of {@link APP_KEYS} and the kit texts for the rest.
 */
export function appUiKitIntl(i18n: I18nService): UiKitIntl {
  const kit = uiKitIntlFromLang(i18n.locale, undefined, i18n.formatLocale);
  return {
    lang: kit.lang,
    formatLocale: kit.formatLocale,
    translate: (key, params) => {
      const own = APP_KEYS[key];
      return own ? i18n.translate(own, params) : kit.translate(key, params);
    },
  };
}
