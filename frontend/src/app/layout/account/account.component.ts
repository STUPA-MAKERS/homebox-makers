import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { CollectionService } from '@core/collection/collection.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import type { Locale } from '@core/i18n/translations';
import {
  IconComponent,
  SelectFieldComponent,
  type SelectFieldOption,
  ThemeService,
} from '@stupa-makers/ui-kit';
import {
  AccountMenuComponent,
  type AccountMenuVariant,
  type ShellLanguage,
} from '@stupa-makers/ui-kit/shell';

/** The languages of the account menu, each named in its own language. */
const LANGUAGES: readonly ShellLanguage[] = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
];

/**
 * The account menu of the kit with the Homebox parts: who is signed in, the switch of the
 * collection (only in the sheet, because on a desktop the rail switches it), profile and
 * collection settings, language, dark mode and logout.
 */
@Component({
  selector: 'app-account',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, IconComponent, SelectFieldComponent, AccountMenuComponent],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);
  readonly theme = inject(ThemeService);
  readonly collections = inject(CollectionService);

  readonly variant = input<AccountMenuVariant>('auto');
  /** A link was followed or the collection changed: the sheet that holds the menu closes. */
  readonly navigated = output<void>();

  readonly languages = LANGUAGES;

  readonly displayName = computed(() => {
    const user = this.auth.user();
    return user?.name || user?.email || '';
  });

  readonly collectionOptions = computed<SelectFieldOption[]>(() =>
    this.collections.all().map((g) => ({ value: g.id, label: g.name })),
  );

  /** A new collection shows other data everywhere, so the app starts over on the start page. */
  switchCollection(id: string): void {
    if (!id || id === this.collections.selectedId()) return;
    this.collections.select(id);
    this.navigated.emit();
    void this.router.navigateByUrl('/home').then(() => window.location.reload());
  }

  setLocale(locale: string): void {
    if (locale === 'de' || locale === 'en') this.i18n.setLocale(locale as Locale);
  }

  setDark(dark: boolean): void {
    this.theme.setPreference(dark ? 'dark' : 'light');
  }

  logout(): void {
    this.auth.logout().subscribe(() => void this.router.navigate(['/login']));
  }
}
