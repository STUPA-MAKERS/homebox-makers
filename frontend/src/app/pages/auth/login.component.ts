import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { ApiClient } from '@core/api/api-client.service';
import { AuthService } from '@core/auth/auth.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { errorMessage } from '@shared/http-error';
import { PublicCardComponent } from '@shared/ui/public-card/public-card.component';
import {
  ButtonComponent,
  CheckboxComponent,
  InputComponent,
  NoteComponent,
} from '@stupa-makers/ui-kit';

type Mode = 'login' | 'register';

/**
 * Sign-in and registration on one card. Registration shows when the server allows it or
 * when an invitation token comes with the link (`/login?token=…`, the invitation of a
 * collection); the OIDC button shows when the server has a provider. After a sign-in the
 * page goes to `redirect`, else to the start page.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    PublicCardComponent,
    InputComponent,
    CheckboxComponent,
    ButtonComponent,
    NoteComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './auth.scss',
})
export class LoginComponent {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  /** Query `redirect`: the page the guard came from. */
  readonly redirect = input<string | undefined>();
  /** Query `token`: an invitation to a collection, which also allows a registration. */
  readonly token = input<string | undefined>();

  readonly status = toSignal(this.api.status().pipe(catchError(() => of(null))), {
    initialValue: null,
  });

  readonly mode = signal<Mode>('login');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  email = '';
  password = '';
  name = '';
  remember = false;

  readonly canRegister = computed(() => !!this.token() || !!this.status()?.allowRegistration);
  readonly oidc = computed(() => this.status()?.oidc ?? null);
  readonly localLogin = computed(() => this.oidc()?.allowLocal ?? true);

  constructor() {
    queueMicrotask(() => {
      if (this.token()) this.mode.set('register');
    });
  }

  setMode(mode: Mode): void {
    this.mode.set(mode);
    this.error.set(null);
  }

  submit(): void {
    if (this.busy()) return;
    this.error.set(null);
    if (!this.email || !this.password || (this.mode() === 'register' && !this.name)) {
      this.error.set(this.i18n.translate('auth.error.required'));
      return;
    }
    this.busy.set(true);
    if (this.mode() === 'register') {
      this.api
        .register({
          email: this.email,
          name: this.name,
          password: this.password,
          token: this.token() ?? '',
        })
        .subscribe({
          next: () => this.signIn(),
          error: (err) => this.fail(err, 'auth.error.register'),
        });
    } else {
      this.signIn();
    }
  }

  oidcLogin(): void {
    window.location.href = this.api.oidcLoginUrl();
  }

  private signIn(): void {
    this.auth.login(this.email, this.password, this.remember).subscribe({
      next: (user) => {
        this.busy.set(false);
        if (!user) {
          this.error.set(this.i18n.translate('auth.error.login'));
          return;
        }
        void this.router.navigateByUrl(this.safeRedirect());
      },
      // The server's text ("authentication failed") says less than ours.
      error: () => {
        this.busy.set(false);
        this.error.set(this.i18n.translate('auth.error.login'));
      },
    });
  }

  private fail(err: unknown, key: 'auth.error.login' | 'auth.error.register'): void {
    this.busy.set(false);
    this.error.set(errorMessage(err, this.i18n.translate(key)));
  }

  /** Only a path of this app, never another origin. */
  private safeRedirect(): string {
    const target = this.redirect();
    return target && target.startsWith('/') && !target.startsWith('//') ? target : '/home';
  }
}
