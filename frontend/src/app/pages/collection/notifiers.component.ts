import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient } from '@core/api/api-client.service';
import type { NotifierOut } from '@core/api/models';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { errorMessage } from '@shared/http-error';
import {
  ButtonComponent,
  ConfirmDialogComponent,
  DialogComponent,
  EmptyStateComponent,
  FabComponent,
  IconComponent,
  InputComponent,
  NoteComponent,
  PageHeaderComponent,
  RowMenuComponent,
  type RowMenuItem,
  type RowMenuSection,
  SkeletonComponent,
  SwitchComponent,
  ToastService,
} from '@stupa-makers/ui-kit';

/**
 * The notifiers of the signed-in user: Shoutrrr URLs (ntfy, Discord, Matrix, mail …) that
 * get a message when maintenance is due. The server tests a URL without saving it.
 */
@Component({
  selector: 'app-notifiers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    PageHeaderComponent,
    FabComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    DialogComponent,
    EmptyStateComponent,
    IconComponent,
    InputComponent,
    NoteComponent,
    RowMenuComponent,
    SkeletonComponent,
    SwitchComponent,
  ],
  template: `
    <div class="page co">
      <app-page-header [title]="'collection.tab.notifiers' | t" />
      <app-fab [label]="'fab.notifier' | t" (activate)="openNew()" />

      @if (error()) {
        <app-note kind="error" icon="alert" retryable (retry)="load()">{{
          'common.loadError' | t
        }}</app-note>
      } @else if (loading()) {
        <app-skeleton variant="rows" [count]="3" [lead]="true" [label]="'common.loading' | t" />
      } @else if (sorted().length === 0) {
        <app-empty-state
          icon="bell"
          [heading]="'notifiers.empty' | t"
          [body]="'notifiers.body' | t"
        />
      } @else {
        <p class="muted co__lead">{{ 'notifiers.body' | t }}</p>
        <div class="rowgroup">
          @for (n of sorted(); track n.id) {
            <div class="co__row">
              <span class="co__lead-icon"><app-icon name="bell" [size]="18" /></span>
              <div class="co__text">
                <span class="co__name">{{ n.name }}</span>
                <span class="muted co__sub"
                  >{{ (n.isActive ? 'notifiers.active' : 'notifiers.paused') | t }} ·
                  {{ scheme(n.url) }}</span
                >
              </div>
              <app-row-menu
                [label]="'common.actions' | t"
                [sections]="menu()"
                (selected)="onMenu(n, $event)"
              />
            </div>
          }
        </div>
      }
    </div>

    <app-dialog
      [open]="editing() !== null"
      size="form"
      [title]="(editing() === 'new' ? 'notifiers.new' : 'notifiers.edit') | t"
      [closeLabel]="'common.close' | t"
      (closed)="editing.set(null)"
    >
      <form class="form-stack" (ngSubmit)="save()" novalidate>
        <app-input name="name" [label]="'field.name' | t" [required]="true" [(ngModel)]="name" />
        <app-input
          name="url"
          [label]="'notifiers.url' | t"
          [hint]="'notifiers.urlHint' | t"
          [required]="true"
          [(ngModel)]="url"
        />
        <app-switch name="active" [(ngModel)]="active">{{
          'notifiers.activeLabel' | t
        }}</app-switch>
        @if (formError()) {
          <app-note kind="error" icon="alert">{{ formError() }}</app-note>
        }
      </form>
      <div dialog-footer>
        <app-button variant="text" [loading]="testing()" (click)="test()">{{
          'notifiers.test' | t
        }}</app-button>
        <app-button variant="text" (click)="editing.set(null)">{{
          'common.cancel' | t
        }}</app-button>
        <app-button [loading]="busy()" (click)="save()">{{ 'common.save' | t }}</app-button>
      </div>
    </app-dialog>

    <app-confirm-dialog
      [open]="deleting() !== null"
      [title]="'notifiers.deleteTitle' | t"
      [body]="'notifiers.deleteBody' | t: { name: deleting()?.name ?? '' }"
      [confirmLabel]="'common.delete' | t"
      [busy]="busy()"
      (confirm)="confirmDelete()"
      (cancel)="deleting.set(null)"
    />
  `,
  styleUrl: './collection.component.scss',
})
export class NotifiersComponent {
  private readonly api = inject(ApiClient);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);

  readonly notifiers = signal<NotifierOut[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly editing = signal<NotifierOut | 'new' | null>(null);
  readonly deleting = signal<NotifierOut | null>(null);
  readonly busy = signal(false);
  readonly testing = signal(false);
  readonly formError = signal<string | null>(null);
  name = '';
  url = '';
  active = true;

  readonly sorted = computed(() =>
    [...this.notifiers()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  readonly menu = computed<RowMenuSection[]>(() => [
    {
      items: [
        { id: 'edit', label: this.i18n.translate('common.edit'), icon: 'edit' },
        { id: 'test', label: this.i18n.translate('notifiers.test'), icon: 'check' },
        { id: 'delete', label: this.i18n.translate('common.delete'), icon: 'trash', danger: true },
      ],
    },
  ]);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.notifiers().subscribe({
      next: (all) => {
        this.notifiers.set(all ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  /** The service of a Shoutrrr URL ("ntfy", "discord"), without the secret parts. */
  scheme(url: string): string {
    return url.split(':')[0] || url;
  }

  openNew(): void {
    this.name = '';
    this.url = '';
    this.active = true;
    this.formError.set(null);
    this.editing.set('new');
  }

  onMenu(n: NotifierOut, item: RowMenuItem): void {
    if (item.id === 'delete') {
      this.deleting.set(n);
    } else if (item.id === 'test') {
      this.sendTest(n.url);
    } else {
      this.name = n.name;
      this.url = n.url;
      this.active = n.isActive;
      this.formError.set(null);
      this.editing.set(n);
    }
  }

  test(): void {
    const url = this.url.trim();
    if (!url) {
      this.formError.set(this.i18n.translate('notifiers.error.url'));
      return;
    }
    this.sendTest(url);
  }

  private sendTest(url: string): void {
    this.testing.set(true);
    this.api.testNotifier(url).subscribe({
      next: () => {
        this.testing.set(false);
        this.toast.show(this.i18n.translate('notifiers.testSent'), 'success');
      },
      error: (err) => {
        this.testing.set(false);
        this.toast.show(errorMessage(err, this.i18n.translate('notifiers.testFailed')), 'danger');
      },
    });
  }

  save(): void {
    const target = this.editing();
    if (!target || this.busy()) return;
    const name = this.name.trim();
    const url = this.url.trim();
    if (!name) {
      this.formError.set(this.i18n.translate('create.error.name'));
      return;
    }
    if (!url) {
      this.formError.set(this.i18n.translate('notifiers.error.url'));
      return;
    }
    this.busy.set(true);
    const body = { name, url, isActive: this.active };
    const call =
      target === 'new' ? this.api.createNotifier(body) : this.api.updateNotifier(target.id, body);
    call.subscribe({
      next: (saved) => {
        this.busy.set(false);
        this.editing.set(null);
        this.notifiers.update((all) => [...all.filter((n) => n.id !== saved.id), saved]);
      },
      error: (err) => {
        this.busy.set(false);
        this.formError.set(errorMessage(err, this.i18n.translate('common.error')));
      },
    });
  }

  confirmDelete(): void {
    const n = this.deleting();
    if (!n) return;
    this.busy.set(true);
    this.api.deleteNotifier(n.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.deleting.set(null);
        this.notifiers.update((all) => all.filter((x) => x.id !== n.id));
      },
      error: (err) => {
        this.busy.set(false);
        this.deleting.set(null);
        this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger');
      },
    });
  }
}
