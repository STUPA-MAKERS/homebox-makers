import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiClient } from '@core/api/api-client.service';
import type { CurrenciesCurrency, GroupInvitation, UserSummary } from '@core/api/models';
import { AuthService } from '@core/auth/auth.service';
import { CollectionService } from '@core/collection/collection.service';
import { I18nService } from '@core/i18n/i18n.service';
import { LocalizedDatePipe } from '@core/i18n/localized-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { errorMessage } from '@shared/http-error';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import {
  ButtonComponent,
  ConfirmDialogComponent,
  CopyButtonComponent,
  DatepickerComponent,
  DialogComponent,
  IconComponent,
  InputComponent,
  NoteComponent,
  SelectFieldComponent,
  type SelectFieldOption,
  SkeletonComponent,
  ToastService,
} from '@stupa-makers/ui-kit';

/** The day a week from now, as `YYYY-MM-DD`. */
function inAWeek(): string {
  const d = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * The selected collection: its name and currency, the members, the invitations (a link
 * per invitation), joining another collection with a link and starting a new one.
 * An invitation link (`/?token=…`) of a signed-in user lands here with `?join=`.
 */
@Component({
  selector: 'app-collection',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    LocalizedDatePipe,
    PageHeaderComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    CopyButtonComponent,
    DatepickerComponent,
    DialogComponent,
    IconComponent,
    InputComponent,
    NoteComponent,
    SelectFieldComponent,
    SkeletonComponent,
  ],
  templateUrl: './collection.component.html',
  styleUrl: './collection.component.scss',
})
export class CollectionComponent {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);
  readonly collections = inject(CollectionService);

  /** Query `join`: an invitation token from a link. */
  readonly join = input<string | undefined>();

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly members = signal<UserSummary[]>([]);
  readonly invitations = signal<GroupInvitation[]>([]);
  readonly currencies = signal<CurrenciesCurrency[]>([]);

  // Settings
  name = '';
  readonly currency = signal('');
  readonly settingsBusy = signal(false);
  readonly settingsError = signal<string | null>(null);

  // Invitations
  readonly inviteDialog = signal(false);
  inviteUses = '1';
  inviteExpires = '';
  readonly inviteBusy = signal(false);
  readonly inviteError = signal<string | null>(null);
  readonly deletingInvite = signal<GroupInvitation | null>(null);

  // Members
  readonly removingMember = signal<UserSummary | null>(null);
  readonly memberBusy = signal(false);

  // Join and new
  readonly joinDialog = signal(false);
  joinCode = '';
  readonly joinBusy = signal(false);
  readonly joinError = signal<string | null>(null);
  readonly newDialog = signal(false);
  newName = '';
  readonly newBusy = signal(false);
  readonly newError = signal<string | null>(null);

  readonly selfId = computed(() => this.auth.user()?.id);
  readonly currencyOptions = computed<SelectFieldOption[]>(() =>
    this.currencies().map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` })),
  );
  /** Invitations that can still be used. */
  readonly openInvitations = computed(() =>
    this.invitations().filter((i) => i.uses > 0 && new Date(i.expiresAt).getTime() > Date.now()),
  );

  constructor() {
    this.load();
    effect(() => {
      const token = this.join();
      if (!token) return;
      untracked(() => {
        this.joinCode = token;
        this.joinError.set(null);
        this.joinDialog.set(true);
        void this.router.navigate([], { queryParams: { join: null }, replaceUrl: true });
      });
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    forkJoin({
      group: this.api.group(),
      members: this.api.members(),
      invitations: this.api.invitations(),
      currencies: this.api.currencies(),
    }).subscribe({
      next: ({ group, members, invitations, currencies }) => {
        this.name = group.name;
        this.currency.set(group.currency);
        this.members.set(members ?? []);
        this.invitations.set(invitations ?? []);
        this.currencies.set(currencies ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  saveSettings(): void {
    if (this.settingsBusy()) return;
    const name = this.name.trim();
    if (!name) {
      this.settingsError.set(this.i18n.translate('create.error.name'));
      return;
    }
    this.settingsBusy.set(true);
    this.settingsError.set(null);
    this.api.updateGroup({ name, currency: this.currency() }).subscribe({
      next: (group) => {
        this.settingsBusy.set(false);
        this.collections.upsert(group);
        this.toast.show(this.i18n.translate('common.saved'), 'success');
      },
      error: (err) => {
        this.settingsBusy.set(false);
        this.settingsError.set(errorMessage(err, this.i18n.translate('common.error')));
      },
    });
  }

  inviteLink(inv: GroupInvitation): string {
    return `${window.location.origin}/?token=${inv.id}`;
  }

  openInviteDialog(): void {
    this.inviteUses = '1';
    this.inviteExpires = inAWeek();
    this.inviteError.set(null);
    this.inviteDialog.set(true);
  }

  createInvite(): void {
    if (this.inviteBusy()) return;
    const uses = Math.round(Number(this.inviteUses));
    if (!uses || uses < 1 || uses > 100) {
      this.inviteError.set(this.i18n.translate('collection.invite.usesError'));
      return;
    }
    if (!this.inviteExpires) {
      this.inviteError.set(this.i18n.translate('collection.invite.expiresError'));
      return;
    }
    this.inviteBusy.set(true);
    this.inviteError.set(null);
    this.api.createInvitation({ uses, expiresAt: `${this.inviteExpires}T23:59:59Z` }).subscribe({
      next: (inv) => {
        this.inviteBusy.set(false);
        this.inviteDialog.set(false);
        this.invitations.update((all) => [inv, ...all]);
      },
      error: (err) => {
        this.inviteBusy.set(false);
        this.inviteError.set(errorMessage(err, this.i18n.translate('common.error')));
      },
    });
  }

  deleteInvite(): void {
    const inv = this.deletingInvite();
    if (!inv) return;
    this.inviteBusy.set(true);
    this.api.deleteInvitation(inv.id).subscribe({
      next: () => {
        this.inviteBusy.set(false);
        this.deletingInvite.set(null);
        this.invitations.update((all) => all.filter((i) => i.id !== inv.id));
      },
      error: (err) => {
        this.inviteBusy.set(false);
        this.deletingInvite.set(null);
        this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger');
      },
    });
  }

  removeMember(): void {
    const member = this.removingMember();
    if (!member) return;
    this.memberBusy.set(true);
    this.api.removeMember(member.id).subscribe({
      next: () => {
        this.memberBusy.set(false);
        this.removingMember.set(null);
        this.members.update((all) => all.filter((m) => m.id !== member.id));
      },
      error: (err) => {
        this.memberBusy.set(false);
        this.removingMember.set(null);
        this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger');
      },
    });
  }

  openJoin(): void {
    this.joinCode = '';
    this.joinError.set(null);
    this.joinDialog.set(true);
  }

  /** Join with a code or a whole invitation link (`…?token=<code>`). */
  acceptJoin(): void {
    if (this.joinBusy()) return;
    const raw = this.joinCode.trim();
    const code = raw.includes('token=') ? (raw.split('token=')[1]?.split('&')[0] ?? '') : raw;
    if (code.length !== 26) {
      this.joinError.set(this.i18n.translate('collection.join.invalid'));
      return;
    }
    this.joinBusy.set(true);
    this.joinError.set(null);
    this.api.acceptInvitation(code).subscribe({
      next: (group) => {
        this.joinBusy.set(false);
        this.joinDialog.set(false);
        this.switchTo(group.id, this.i18n.translate('collection.join.done', { name: group.name }));
      },
      error: (err) => {
        this.joinBusy.set(false);
        this.joinError.set(errorMessage(err, this.i18n.translate('collection.join.failed')));
      },
    });
  }

  openNew(): void {
    this.newName = '';
    this.newError.set(null);
    this.newDialog.set(true);
  }

  createCollection(): void {
    if (this.newBusy()) return;
    const name = this.newName.trim();
    if (!name) {
      this.newError.set(this.i18n.translate('create.error.name'));
      return;
    }
    this.newBusy.set(true);
    this.newError.set(null);
    this.api.createGroup(name).subscribe({
      next: (group) => {
        this.newBusy.set(false);
        this.newDialog.set(false);
        this.switchTo(group.id, this.i18n.translate('collection.new.done', { name: group.name }));
      },
      error: (err) => {
        this.newBusy.set(false);
        this.newError.set(errorMessage(err, this.i18n.translate('common.error')));
      },
    });
  }

  /** Select another collection and start the app fresh in it (all cached data is per collection). */
  private switchTo(id: string, message: string): void {
    this.toast.show(message, 'success');
    this.collections.select(id);
    void this.router.navigateByUrl('/collection').then(() => window.location.reload());
  }
}
