import '@testing-library/jest-dom';
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
import { registerCatalog } from './src/app/core/i18n/translations';
import { en } from './src/app/core/i18n/translations.en';

setupZoneTestEnv();

// jsdom reports `en-US`. Pin German, the reference locale, so the tests stay deterministic.
Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });

// jsdom does not implement matchMedia. ThemeService and the media signals of the kit need it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

if (!('ResizeObserver' in globalThis)) {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    writable: true,
    value: class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  });
}

registerCatalog('en', en);
