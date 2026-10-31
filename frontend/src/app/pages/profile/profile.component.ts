import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiClient } from '@core/api/api-client.service';
import type { APIKeyCreatedOut, APIKeyOut } from '@core/api/models';
import { AuthService } from '@core/auth/auth.service';
import { I18nService } from '@core/i18n/i18n.service';
import { LocalizedDatePipe } from '@core/i18n/localized-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { errorMessage } from '@shared/http-error';
import {
  ButtonComponent,
  ConfirmDialogComponent,
  CopyButtonComponent,
  DatepickerComponent,
  DialogComponent,
  FabComponent,
  IconComponent,
  InputComponent,
  NoteComponent,
  PageHeaderComponent,
  RowMenuComponent,
  type RowMenuItem,
  type RowMenuSection,
  ToastService,
} from '@stupa-makers/ui-kit';

/**
 * The account of the signed-in user: name and e-mail, the password, the API keys and the
 * deletion of the account.
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    LocalizedDatePipe,
    PageHeaderComponent,
    FabComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    CopyButtonComponent,
    DatepickerComponent,
    DialogComponent,
    IconComponent,
    InputComponent,
    NoteComponent,
    RowMenuComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);

  readonly user = this.auth.user;
  /** A user of a single sign-on manages name, e-mail and password at the provider. */
  readonly isOidc = computed(() => !!this.user()?.oidcIssuer);

  // Account
  name = this.user()?.name ?? '';
  email = this.user()?.email ?? '';
  readonly accountBusy = signal(false);
  /** The save button shows only after the name or the e-mail changed. */
  accountDirty(): boolean {
    const u = this.user();
    return this.name.trim() !== (u?.name ?? '') || this.email.trim() !== (u?.email ?? '');
  }
  readonly accountError = signal<string | null>(null);

  // Password
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  readonly passwordBusy = signal(false);
  readonly passwordError = signal<string | null>(null);

  // API keys
  readonly keys = signal<APIKeyOut[]>([]);
  readonly keysLoading = signal(true);
  readonly keysError = signal(false);
  readonly keyDialog = signal(false);
  keyName = '';
  keyExpires = '';
  readonly keyBusy = signal(false);
  readonly keyError = signal<string | null>(null);
  readonly createdKey = signal<APIKeyCreatedOut | null>(null);
  readonly deletingKey = signal<APIKeyOut | null>(null);

  // Delete account
  readonly confirmDeleteAccount = signal(false);
  readonly deleteBusy = signal(false);

  readonly keyMenu = computed<RowMenuSection[]>(() => [
    {
      items: [
        {
          id: 'delete',
          label: this.i18n.translate('profile.keys.revoke'),
          icon: 'trash',
          danger: true,
        },
      ],
    },
  ]);

  constructor() {
    this.loadKeys();
  }

  saveAccount(): void {
    if (this.accountBusy()) return;
    const name = this.name.trim();
    const email = this.email.trim();
    if (!name || !email) {
      this.accountError.set(this.i18n.translate('auth.error.required'));
      return;
    }
    this.accountBusy.set(true);
    this.accountError.set(null);
    this.api.updateSelf({ name, email }).subscribe({
      next: (user) => {
        this.accountBusy.set(false);
        this.auth.setUser(user);
        this.toast.show(this.i18n.translate('common.saved'), 'success');
      },
      error: (err) => {
        this.accountBusy.set(false);
        this.accountError.set(errorMessage(err, this.i18n.translate('common.error')));
      },
    });
  }

  changePassword(): void {
    if (this.passwordBusy()) return;
    if (!this.currentPassword || !this.newPassword) {
      this.passwordError.set(this.i18n.translate('auth.error.required'));
      return;
    }
    if (this.newPassword.length < 8) {
      this.passwordError.set(this.i18n.translate('auth.field.passwordHint'));
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError.set(this.i18n.translate('auth.reset.mismatch'));
      return;
    }
    this.passwordBusy.set(true);
    this.passwordError.set(null);
    this.api.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.passwordBusy.set(false);
        this.currentPassword = this.newPassword = this.confirmPassword = '';
        this.toast.show(this.i18n.translate('profile.password.changed'), 'success');
      },
      error: (err) => {
        this.passwordBusy.set(false);
        this.passwordError.set(errorMessage(err, this.i18n.translate('profile.password.failed')));
      },
    });
  }

  loadKeys(): void {
    this.keysLoading.set(true);
    this.keysError.set(false);
    this.api.listApiKeys().subscribe({
      next: (keys) => {
        this.keys.set(keys ?? []);
        this.keysLoading.set(false);
      },
      error: () => {
        this.keysLoading.set(false);
        this.keysError.set(true);
      },
    });
  }

  openKeyDialog(): void {
    this.keyName = '';
    this.keyExpires = '';
    this.keyError.set(null);
    this.createdKey.set(null);
    this.keyDialog.set(true);
  }

  createKey(): void {
    if (this.keyBusy()) return;
    const name = this.keyName.trim();
    if (!name) {
      this.keyError.set(this.i18n.translate('create.error.name'));
      return;
    }
    this.keyBusy.set(true);
    this.keyError.set(null);
    this.api
      .createApiKey({ name, expiresAt: this.keyExpires ? `${this.keyExpires}T23:59:59Z` : null })
      .subscribe({
        next: (key) => {
          this.keyBusy.set(false);
          this.createdKey.set(key);
          this.loadKeys();
        },
        error: (err) => {
          this.keyBusy.set(false);
          this.keyError.set(errorMessage(err, this.i18n.translate('common.error')));
        },
      });
  }

  closeKeyDialog(): void {
    this.keyDialog.set(false);
    this.createdKey.set(null);
  }

  onKeyMenu(key: APIKeyOut, item: RowMenuItem): void {
    if (item.id === 'delete') this.deletingKey.set(key);
  }

  revokeKey(): void {
    const key = this.deletingKey();
    if (!key) return;
    this.keyBusy.set(true);
    this.api.deleteApiKey(key.id).subscribe({
      next: () => {
        this.keyBusy.set(false);
        this.deletingKey.set(null);
        this.keys.update((all) => all.filter((k) => k.id !== key.id));
        this.toast.show(this.i18n.translate('profile.keys.revoked', { name: key.name }), 'success');
      },
      error: (err) => {
        this.keyBusy.set(false);
        this.deletingKey.set(null);
        this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger');
      },
    });
  }

  isExpired(key: APIKeyOut): boolean {
    return !!key.expiresAt && new Date(key.expiresAt).getTime() < Date.now();
  }

  deleteAccount(): void {
    this.deleteBusy.set(true);
    this.api.deleteSelf().subscribe({
      next: () => {
        this.deleteBusy.set(false);
        this.confirmDeleteAccount.set(false);
        this.auth.invalidate();
        void this.router.navigate(['/login']);
      },
      error: (err) => {
        this.deleteBusy.set(false);
        this.confirmDeleteAccount.set(false);
        this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger');
      },
    });
  }
}
