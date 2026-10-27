import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { CollectionService } from '@core/collection/collection.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import type { Locale } from '@core/i18n/translations';
import { ThemeService } from '@core/theme/theme.service';
import {
  AvatarComponent,
  IconComponent,
  SegmentedComponent,
  type SegmentedOption,
  SelectFieldComponent,
  type SelectFieldOption,
  SwitchComponent,
} from '@stupa-makers/ui-kit';

export type AccountMenuVariant = 'popover' | 'sheet';

/** Gap between the rail and the popover, and the least gap to the window edge. */
const GAP = 8;

let nextId = 0;

/**
 * The account menu: who is signed in, the collection switch, profile and collection
 * settings, language, dark mode and logout. `popover` opens beside the rail from the avatar,
 * `sheet` renders the same content inline in the "Mehr" sheet of the phone.
 */
@Component({
  selector: 'app-account-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    RouterLink,
    TranslatePipe,
    IconComponent,
    SwitchComponent,
    AvatarComponent,
    SegmentedComponent,
    SelectFieldComponent,
  ],
  templateUrl: './account-menu.component.html',
  styleUrl: './account-menu.component.scss',
})
export class AccountMenuComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly i18n = inject(I18nService);
  readonly collections = inject(CollectionService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly variant = input<AccountMenuVariant>('popover');
  readonly navigated = output<void>();

  readonly open = signal(false);
  readonly position = signal({ left: 0, bottom: 0 });

  protected readonly panelId = `account-menu-${nextId++}`;
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  readonly displayName = computed(() => {
    const user = this.auth.user();
    return user?.name || user?.email || '';
  });

  readonly collectionOptions = computed<SelectFieldOption[]>(() =>
    this.collections.all().map((g) => ({ value: g.id, label: g.name })),
  );

  readonly languageOptions: SegmentedOption[] = [
    { value: 'de', label: 'DE' },
    { value: 'en', label: 'EN' },
  ];

  toggle(): void {
    if (this.open()) this.close();
    else this.show();
  }

  show(): void {
    const trigger = this.trigger()!.nativeElement;
    const rect = trigger.getBoundingClientRect();
    const edge = trigger.closest('nav')?.getBoundingClientRect().right ?? rect.right;
    this.position.set({
      left: edge + GAP,
      bottom: Math.max(GAP, window.innerHeight - rect.bottom),
    });
    this.open.set(true);
    setTimeout(() => this.panel()?.nativeElement.querySelector<HTMLElement>('a, button')?.focus());
  }

  close(restoreFocus = false): void {
    if (!this.open()) return;
    this.open.set(false);
    if (restoreFocus) this.trigger()?.nativeElement.focus();
  }

  onNavigate(): void {
    this.close();
    this.navigated.emit();
  }

  /** A new collection shows other data everywhere, so the app starts over on the start page. */
  switchCollection(id: string): void {
    if (!id || id === this.collections.selectedId()) return;
    this.collections.select(id);
    this.close();
    this.navigated.emit();
    void this.router.navigateByUrl('/home').then(() => window.location.reload());
  }

  setLocale(locale: string | null): void {
    if (locale === 'de' || locale === 'en') this.i18n.setLocale(locale as Locale);
  }

  setDark(dark: boolean): void {
    this.theme.setPreference(dark ? 'dark' : 'light');
  }

  logout(): void {
    this.close();
    this.auth.logout().subscribe(() => void this.router.navigate(['/login']));
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close(true);
  }

  @HostListener('document:pointerdown', ['$event'])
  onPointerDown(event: Event): void {
    if (!this.open()) return;
    // The select of the collection opens its list in the top layer, outside the host.
    const target = event.target as Element | null;
    if (target?.closest?.('[role="listbox"]')) return;
    if (!this.host.nativeElement.contains(target as Node)) this.close();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.close();
  }
}
