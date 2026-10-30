import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';
import { appUiKitIntl } from './ui-kit-intl';

describe('appUiKitIntl', () => {
  function setup() {
    const i18n = TestBed.inject(I18nService);
    return { i18n, intl: appUiKitIntl(i18n) };
  }

  it('shows the app wording for the texts of the shell', () => {
    const { intl } = setup();
    expect(intl.translate('shell.brand', { name: 'Homebox' })).toBe('Homebox, Start');
    expect(intl.translate('account.open', { name: 'Ada' })).toBe('Konto: Ada');
    expect(intl.translate('palette.placeholder')).toBe('Gegenstände, Orte, Tags und Seiten suchen');
  });

  it('keeps the kit texts for every other key', () => {
    const { intl } = setup();
    expect(intl.translate('loading')).toBe('Wird geladen…');
  });

  it('follows the locale of the app', async () => {
    const { i18n, intl } = setup();
    i18n.setLocale('en');
    await i18n.ready();
    await new Promise((resolve) => setTimeout(resolve));
    expect(intl.lang()).toBe('en');
    expect(intl.formatLocale()).toBe('en-GB');
    expect(intl.translate('account.darkMode')).toBe('Dark mode');
  });
});
