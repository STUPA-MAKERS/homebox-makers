import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiClient } from '@core/api/api-client.service';
import type { EntityTemplateSummary } from '@core/api/models';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { errorMessage } from '@shared/http-error';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import {
  ButtonComponent,
  DialogComponent,
  EmptyStateComponent,
  IconComponent,
  InputComponent,
  ListItemComponent,
  NoteComponent,
  SkeletonComponent,
  ToastService,
} from '@stupa-makers/ui-kit';
import { CollectionTabsComponent } from './collection-tabs.component';

/**
 * The item templates of the collection. A template fills in a new item (name, description,
 * manufacturer, location, tags, custom fields); "Neue Vorlage" asks for a name and opens
 * the template for the rest.
 */
@Component({
  selector: 'app-templates',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    PageHeaderComponent,
    CollectionTabsComponent,
    ButtonComponent,
    DialogComponent,
    EmptyStateComponent,
    IconComponent,
    InputComponent,
    ListItemComponent,
    NoteComponent,
    SkeletonComponent,
  ],
  template: `
    <div class="page co">
      <app-page-header [title]="'nav.collection' | t" [meta]="'collection.tab.templates' | t">
        <ng-container ngProjectAs="[actions]">
          <app-button size="sm" (click)="openNew()">
            <span class="btn-label"><app-icon name="plus" />{{ 'templates.new' | t }}</span>
          </app-button>
        </ng-container>
      </app-page-header>
      <app-collection-tabs active="templates" />

      @if (error()) {
        <app-note kind="error" icon="alert" retryable (retry)="load()">{{
          'common.loadError' | t
        }}</app-note>
      } @else if (loading()) {
        <app-skeleton variant="rows" [count]="4" [lead]="true" [label]="'common.loading' | t" />
      } @else if (sorted().length === 0) {
        <app-empty-state
          icon="form"
          [heading]="'templates.empty' | t"
          [body]="'templates.emptyBody' | t"
        />
      } @else {
        <p class="muted co__lead">{{ 'templates.body' | t }}</p>
        <div class="rowgroup">
          @for (tpl of sorted(); track tpl.id) {
            <app-list-item
              [title]="tpl.name"
              [sub]="tpl.description || null"
              [link]="['/collection/templates', tpl.id]"
            >
              <span lead class="co__lead-icon"><app-icon name="form" [size]="18" /></span>
            </app-list-item>
          }
        </div>
      }
    </div>

    <app-dialog
      [open]="creating()"
      size="form"
      [title]="'templates.new' | t"
      [closeLabel]="'common.close' | t"
      (closed)="creating.set(false)"
    >
      <form class="form-stack" (ngSubmit)="create()" novalidate>
        <app-input name="name" [label]="'field.name' | t" [required]="true" [(ngModel)]="name" />
        @if (formError()) {
          <app-note kind="error" icon="alert">{{ formError() }}</app-note>
        }
      </form>
      <div dialog-footer>
        <app-button variant="text" (click)="creating.set(false)">{{
          'common.cancel' | t
        }}</app-button>
        <app-button [loading]="busy()" (click)="create()">{{ 'common.create' | t }}</app-button>
      </div>
    </app-dialog>
  `,
  styleUrl: './collection.component.scss',
})
export class TemplatesComponent {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);

  readonly templates = signal<EntityTemplateSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly creating = signal(false);
  readonly busy = signal(false);
  readonly formError = signal<string | null>(null);
  name = '';

  readonly sorted = computed(() =>
    [...this.templates()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.templates().subscribe({
      next: (all) => {
        this.templates.set(all ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  openNew(): void {
    this.name = '';
    this.formError.set(null);
    this.creating.set(true);
  }

  create(): void {
    if (this.busy()) return;
    const name = this.name.trim();
    if (!name) {
      this.formError.set(this.i18n.translate('create.error.name'));
      return;
    }
    this.busy.set(true);
    this.api
      .createTemplate({
        name,
        description: '',
        notes: '',
        fields: [],
        defaultInsured: false,
        defaultLifetimeWarranty: false,
        defaultQuantity: 1,
        includePurchaseFields: false,
        includeSoldFields: false,
        includeWarrantyFields: false,
      })
      .subscribe({
        next: (tpl) => {
          this.busy.set(false);
          this.creating.set(false);
          this.toast.show(this.i18n.translate('create.done', { name }), 'success');
          void this.router.navigate(['/collection/templates', tpl.id]);
        },
        error: (err) => {
          this.busy.set(false);
          this.formError.set(errorMessage(err, this.i18n.translate('common.error')));
        },
      });
  }
}
