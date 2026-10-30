import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '@core/auth/auth.service';
import {
  CommandPalette,
  type ShellBrand,
  type ShellFrame,
  ShellComponent,
} from '@stupa-makers/ui-kit/shell';
import { SwUpdatePromptComponent } from '@stupa-makers/ui-kit/pwa';
import { CreateDialogComponent } from '../features/create/create-dialog.component';
import { EditDrawerComponent } from '../features/edit/edit-drawer.component';
import { SearchPaletteComponent } from '../features/search/search-palette.component';
import { AccountComponent } from './account/account.component';
import { CollectionSwitchComponent } from './collection-switch/collection-switch.component';
import { BOTTOM_BAR_KEYS, NavService } from './nav.service';

/**
 * The frame of the app: the kit shell with the Homebox parts in its slots. The rail holds
 * the switch of the collection, the account menu holds the profile and the collection
 * settings (and on a phone the switch of the collection), and the overlays are the create
 * dialog, the edit drawer and the search. There is ONE router outlet (in the kit shell) for
 * every frame, so a sign-in never destroys and recreates the page.
 *
 * - `rail`: a signed-in user. The navigation rail at the start edge, or the bottom bar on a
 *   phone.
 * - `public`: nobody signed in (login, registration, password reset). Only the page.
 * - `pending`: the session is not known yet. Only the page, so no frame flashes up.
 */
@Component({
  selector: 'app-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ShellComponent,
    SwUpdatePromptComponent,
    AccountComponent,
    CollectionSwitchComponent,
    CreateDialogComponent,
    EditDrawerComponent,
    SearchPaletteComponent,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  private readonly auth = inject(AuthService);
  readonly nav = inject(NavService);
  readonly palette = inject(CommandPalette);

  readonly barKeys = BOTTOM_BAR_KEYS;
  /** "Mehr" is active on the profile too, which the account menu opens. */
  readonly morePaths: readonly string[] = ['/profile'];
  readonly brand: ShellBrand = {
    home: '/home',
    label: 'Homebox',
    mark: { light: 'mark-light.svg', dark: 'mark-dark.svg' },
  };

  private readonly sessionKnown = signal(false);

  readonly frame = computed<ShellFrame>(() => {
    if (!this.sessionKnown()) return 'pending';
    return this.auth.isAuthenticated() ? 'rail' : 'public';
  });

  constructor() {
    this.auth
      .ensureLoaded()
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.sessionKnown.set(true));
  }
}
