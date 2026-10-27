import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiClient } from '@core/api/api-client.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { errorMessage } from '@shared/http-error';
import { PublicCardComponent } from '@shared/ui/public-card/public-card.component';
import { ButtonComponent, InputComponent, NoteComponent } from '@stupa-makers/ui-kit';

/** Set a new password with the token of the reset mail (`/reset-password?token=…`). */
@Component({
  selector: 'app-reset-password',
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
    <app-public-card [title]="'auth.reset.title' | t">
      @if (done()) {
        <app-note kind="success" icon="check">{{ 'auth.reset.done' | t }}</app-note>
      } @else if (!token()) {
        <app-note kind="danger" icon="alert">{{ 'auth.reset.noToken' | t }}</app-note>
      } @else {
        <form class="form-stack" (ngSubmit)="submit()" novalidate>
          <app-input
            name="password"
            type="password"
            [label]="'auth.reset.password' | t"
            [hint]="'auth.field.passwordHint' | t"
            [required]="true"
            [(ngModel)]="password"
          />
          <app-input
            name="confirm"
            type="password"
            [label]="'auth.reset.confirm' | t"
            [required]="true"
            [(ngModel)]="confirm"
          />
          @if (error()) {
            <app-note kind="danger" icon="alert">{{ error() }}</app-note>
          }
          <app-button type="submit" [block]="true" [loading]="busy()">
            {{ 'auth.reset.submit' | t }}
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
export class ResetPasswordComponent {
  private readonly api = inject(ApiClient);
  private readonly i18n = inject(I18nService);

  readonly token = input<string | undefined>();

  password = '';
  confirm = '';
  readonly busy = signal(false);
  readonly done = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    if (this.busy()) return;
    if (!this.password || this.password !== this.confirm) {
      this.error.set(this.i18n.translate('auth.reset.mismatch'));
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.api.resetPassword(this.token() ?? '', this.password).subscribe({
      next: () => {
        this.busy.set(false);
        this.done.set(true);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err, this.i18n.translate('common.error')));
      },
    });
  }
}
