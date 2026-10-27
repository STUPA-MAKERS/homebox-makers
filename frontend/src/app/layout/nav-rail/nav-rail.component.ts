import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { IconComponent, ScrollFadeDirective } from '@stupa-makers/ui-kit';
import { AccountMenuComponent } from '../account-menu/account-menu.component';
import { NavService } from '../nav.service';

/**
 * The navigation rail: 96px at the start edge of every signed-in page above the phone width.
 * The mark leads to the start page, the search opens the item list with the search focused,
 * then come the areas, a spacer, the collection settings and the account.
 */
@Component({
  selector: 'app-nav-rail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    IconComponent,
    ScrollFadeDirective,
    AccountMenuComponent,
  ],
  templateUrl: './nav-rail.component.html',
  styleUrl: './nav-rail.component.scss',
})
export class NavRailComponent {
  private readonly nav = inject(NavService);

  readonly mainItems = this.nav.items.filter((i) => i.place === 'main');
  readonly endItems = this.nav.items.filter((i) => i.place === 'end');
}
