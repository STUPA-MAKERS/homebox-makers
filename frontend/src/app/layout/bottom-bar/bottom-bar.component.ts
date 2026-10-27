import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { IconComponent, SideSheetComponent } from '@stupa-makers/ui-kit';
import { AccountMenuComponent } from '../account-menu/account-menu.component';
import { BOTTOM_BAR_KEYS, NavService, type NavItem } from '../nav.service';

/**
 * The phone navigation (viewport <= 768px): Start, Gegenstände, Orte and Tags, then "Mehr".
 * "Mehr" opens a bottom sheet with the other areas and the account menu.
 */
@Component({
  selector: 'app-bottom-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    IconComponent,
    SideSheetComponent,
    AccountMenuComponent,
  ],
  templateUrl: './bottom-bar.component.html',
  styleUrl: './bottom-bar.component.scss',
})
export class BottomBarComponent {
  private readonly nav = inject(NavService);
  private readonly router = inject(Router);

  readonly moreOpen = signal(false);
  private readonly url = signal(this.router.url);

  readonly barItems: NavItem[] = BOTTOM_BAR_KEYS.map((key) =>
    this.nav.items.find((i) => i.key === key),
  ).filter((i): i is NavItem => !!i);

  readonly moreItems: NavItem[] = this.nav.items.filter((i) => !BOTTOM_BAR_KEYS.includes(i.key));

  /** "Mehr" is active while the page belongs to one of its areas or the profile. */
  readonly moreActive = computed(() => {
    const path = this.url().split(/[?#]/)[0];
    const inside = (base: string): boolean => path === base || path.startsWith(`${base}/`);
    return inside('/profile') || this.moreItems.some((i) => inside(i.path));
  });

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        this.url.set(e.urlAfterRedirects);
        this.moreOpen.set(false);
      });
  }
}
