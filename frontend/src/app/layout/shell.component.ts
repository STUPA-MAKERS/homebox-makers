import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { MEDIA, mediaQuery, ToastComponent } from '@stupa-makers/ui-kit';
import { BottomBarComponent } from './bottom-bar/bottom-bar.component';
import { LoadBarComponent } from './load-bar/load-bar.component';
import { NavRailComponent } from './nav-rail/nav-rail.component';
import { PageFrameService } from './page-frame.service';

/**
 * The frame around a page.
 *
 * - `rail`: a signed-in user. The navigation rail at the start edge, or the bottom bar on a
 *   phone.
 * - `public`: nobody signed in (login, registration, password reset). Only the page.
 * - `pending`: the session is not known yet. Only the page, so no frame flashes up.
 */
export type ShellFrame = 'rail' | 'public' | 'pending';

/**
 * App frame: the chrome around the router outlet, the toasts and the loading bar. There is
 * ONE router outlet for every frame, so a sign-in never destroys and recreates the page.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    TranslatePipe,
    ToastComponent,
    LoadBarComponent,
    NavRailComponent,
    BottomBarComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** The page fills the viewport (see `PageFrameService`). */
  readonly fill = inject(PageFrameService).fill;

  /** The viewport is a phone (<= 768px): bottom bar instead of the rail. */
  readonly phone = mediaQuery(MEDIA.phone);

  /** Full-width content from route data `wide`. */
  readonly wide = signal(false);
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

    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        let r = this.route.firstChild;
        let wide = false;
        while (r) {
          wide = r.snapshot.data['wide'] === true || wide;
          r = r.firstChild;
        }
        this.wide.set(wide);
      });
  }
}
