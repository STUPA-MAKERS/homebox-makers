import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiClient } from '@core/api/api-client.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { errorMessage } from '@shared/http-error';
import { PublicCardComponent } from '@shared/ui/public-card/public-card.component';
import { ButtonComponent, InputComponent, NoteComponent } from '@stupa-makers/ui-kit';

/** Request a password-reset mail. The page says the same for a known and an unknown address. */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    PublicCardComponent,
    InputComponent,
    ButtonComponent,
    NoteComponent,
  ],
  template: `
    <app-public-card [title]="'auth.forgot.title' | t" [subtitle]="'auth.forgot.body' | t">
      @if (sent()) {
        <app-note kind="ok" icon="check">{{ 'auth.forgot.sent' | t }}</app-note>
      } @else {
        <form class="form-stack" (ngSubmit)="submit()" novalidate>
          <app-input
            name="email"
            type="email"
            [label]="'auth.field.email' | t"
            [required]="true"
            [(ngModel)]="email"
          />
          @if (error()) {
            <app-note kind="error" icon="alert">{{ error() }}</app-note>
          }
          <app-button type="submit" [block]="true" [loading]="busy()">
            {{ 'auth.forgot.submit' | t }}
          </app-button>
        </form>
      }
      <ng-container ngProjectAs="[foot]">
        <a class="auth__link" routerLink="/login">{{ 'auth.backToLogin' | t }}</a>
      </ng-container>
    </app-public-card>
  `,
  styleUrl: './auth.scss',
})
export class ForgotPasswordComponent {
  private readonly api = inject(ApiClient);
  private readonly i18n = inject(I18nService);

  email = '';
  readonly busy = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    if (!this.email || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    this.api.forgotPassword(this.email).subscribe({
      next: () => {
        this.busy.set(false);
        this.sent.set(true);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err, this.i18n.translate('common.error')));
      },
    });
  }
}
