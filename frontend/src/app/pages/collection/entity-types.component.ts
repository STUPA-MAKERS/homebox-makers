import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiClient } from '@core/api/api-client.service';
import type { EntityTemplateSummary, EntityTypeSummary } from '@core/api/models';
import { RefDataService } from '@core/data/ref-data.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { errorMessage } from '@shared/http-error';
import {
  ButtonComponent,
  ConfirmDialogComponent,
  DialogComponent,
  EmptyStateComponent,
  IconComponent,
  InputComponent,
  NoteComponent,
  PageHeaderComponent,
  RowMenuComponent,
  type RowMenuItem,
  type RowMenuSection,
  SegmentedComponent,
  type SegmentedOption,
  SelectFieldComponent,
  type SelectFieldOption,
  SkeletonComponent,
  ToastService,
} from '@stupa-makers/ui-kit';

/**
 * The entity types of the collection: kinds of items ("Werkzeug", "Buch") and kinds of
 * locations ("Raum", "Regal"). A type can carry a default template for new items.
 */
@Component({
  selector: 'app-entity-types',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    PageHeaderComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    DialogComponent,
    EmptyStateComponent,
    IconComponent,
    InputComponent,
    NoteComponent,
    RowMenuComponent,
    SegmentedComponent,
    SelectFieldComponent,
    SkeletonComponent,
  ],
  templateUrl: './entity-types.component.html',
  styleUrl: './collection.component.scss',
})
export class EntityTypesComponent {
  private readonly api = inject(ApiClient);
  private readonly ref = inject(RefDataService);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);

  readonly types = signal<EntityTypeSummary[]>([]);
  readonly templates = signal<EntityTemplateSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly editing = signal<EntityTypeSummary | 'new' | null>(null);
  readonly deleting = signal<EntityTypeSummary | null>(null);
  readonly busy = signal(false);
  readonly formError = signal<string | null>(null);
  name = '';
  readonly kind = signal<'item' | 'location'>('item');
  readonly templateId = signal('');

  readonly groups = computed(() => {
    const byName = (a: EntityTypeSummary, b: EntityTypeSummary) => a.name.localeCompare(b.name);
    return [
      {
        key: 'item',
        titleKey: 'types.items' as const,
        types: this.types()
          .filter((t) => !t.isLocation)
          .sort(byName),
      },
      {
        key: 'location',
        titleKey: 'types.locations' as const,
        types: this.types()
          .filter((t) => t.isLocation)
          .sort(byName),
      },
    ];
  });

  readonly kindOptions = computed<SegmentedOption[]>(() => [
    { value: 'item', label: this.i18n.translate('types.kind.item') },
    { value: 'location', label: this.i18n.translate('types.kind.location') },
  ]);
  readonly templateOptions = computed<SelectFieldOption[]>(() =>
    this.templates().map((t) => ({ value: t.id, label: t.name })),
  );

  readonly menu = computed<RowMenuSection[]>(() => [
    {
      items: [
        { id: 'edit', label: this.i18n.translate('common.edit'), icon: 'edit' },
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
    forkJoin({ types: this.api.entityTypes(), templates: this.api.templates() }).subscribe({
      next: ({ types, templates }) => {
        this.types.set(types ?? []);
        this.templates.set(templates ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  /** The server leaves out the template of a type without one. */
  templateName(type: EntityTypeSummary): string | null {
    return type.defaultTemplate?.name || null;
  }

  openNew(kind: 'item' | 'location' = 'item'): void {
    this.name = '';
    this.kind.set(kind);
    this.templateId.set('');
    this.formError.set(null);
    this.editing.set('new');
  }

  onMenu(type: EntityTypeSummary, item: RowMenuItem): void {
    if (item.id === 'delete') {
      this.deleting.set(type);
      return;
    }
    this.name = type.name;
    this.kind.set(type.isLocation ? 'location' : 'item');
    this.templateId.set(type.defaultTemplateId ?? '');
    this.formError.set(null);
    this.editing.set(type);
  }

  save(): void {
    const target = this.editing();
    if (!target || this.busy()) return;
    const name = this.name.trim();
    if (!name) {
      this.formError.set(this.i18n.translate('create.error.name'));
      return;
    }
    const body = {
      name,
      isLocation: this.kind() === 'location',
      // The server takes no template as null; an empty string is no UUID.
      defaultTemplateId:
        (this.kind() === 'item' && this.templateId()) || (null as unknown as string),
      icon: target === 'new' ? '' : target.icon,
    };
    this.busy.set(true);
    const call =
      target === 'new'
        ? this.api.createEntityType(body)
        : this.api.updateEntityType(target.id, { ...body, id: target.id });
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.editing.set(null);
        this.ref.reload().subscribe();
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.formError.set(errorMessage(err, this.i18n.translate('common.error')));
      },
    });
  }

  confirmDelete(): void {
    const type = this.deleting();
    if (!type) return;
    this.busy.set(true);
    this.api.deleteEntityType(type.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.deleting.set(null);
        this.types.update((all) => all.filter((t) => t.id !== type.id));
        this.ref.reload().subscribe();
      },
      error: (err) => {
        this.busy.set(false);
        this.deleting.set(null);
        this.toast.show(errorMessage(err, this.i18n.translate('types.deleteFailed')), 'danger');
      },
    });
  }
}
