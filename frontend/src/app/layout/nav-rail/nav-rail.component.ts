import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CollectionService } from '@core/collection/collection.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import {
  IconComponent,
  RowMenuComponent,
  type RowMenuItem,
  type RowMenuSection,
  ScrollFadeDirective,
  searchShortcutKeys,
} from '@stupa-makers/ui-kit';
import { CommandPaletteService } from '../../features/search/command-palette.service';
import { AccountMenuComponent } from '../account-menu/account-menu.component';
import { NavService } from '../nav.service';

/**
 * The navigation rail: 96px at the start edge of every signed-in page above the phone width.
 * The mark leads to the start page, the search opens the global search (Ctrl+K),
 * then come the areas, a spacer, the switch of the collection, the collection settings and
 * the account.
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
    RowMenuComponent,
  ],
  templateUrl: './nav-rail.component.html',
  styleUrl: './nav-rail.component.scss',
})
export class NavRailComponent {
  private readonly nav = inject(NavService);
  readonly palette = inject(CommandPaletteService);
  readonly searchKeys = searchShortcutKeys();

  readonly mainItems = this.nav.items.filter((i) => i.place === 'main');
  readonly endItems = this.nav.items.filter((i) => i.place === 'end');

  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  readonly collections = inject(CollectionService);

  /** The collections to switch to (the current one checked), then new and join. */
  readonly collectionMenu = computed<RowMenuSection[]>(() => [
    {
      items: this.collections.all().map((g) => ({
        id: `go:${g.id}`,
        label: g.name,
        checked: g.id === this.collections.selectedId(),
      })),
    },
    {
      items: [
        { id: 'new', label: this.i18n.translate('collection.new.title'), icon: 'plus' },
        { id: 'join', label: this.i18n.translate('collection.join.title'), icon: 'link' },
      ],
    },
  ]);

  onCollectionMenu(item: RowMenuItem): void {
    if (item.id === 'new' || item.id === 'join') {
      void this.router.navigate(['/collection', 'overview'], { queryParams: { action: item.id } });
      return;
    }
    const id = item.id.slice(3);
    if (id === this.collections.selectedId()) return;
    // Another collection shows other data everywhere, so the app starts over on the start page.
    this.collections.select(id);
    void this.router.navigateByUrl('/home').then(() => window.location.reload());
  }
}
