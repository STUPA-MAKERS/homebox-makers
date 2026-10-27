import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiClient } from '@core/api/api-client.service';
import type { EntityTemplateOut, TemplateField } from '@core/api/models';
import { RefDataService } from '@core/data/ref-data.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { AppTitleStrategy } from '@core/title/title.strategy';
import { errorMessage } from '@shared/http-error';
import { LocationSelectComponent } from '@shared/ui/location-select/location-select.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { TagPickerComponent } from '@shared/ui/tag-picker/tag-picker.component';
import {
  ButtonComponent,
  ButtonLinkComponent,
  CheckboxComponent,
  ConfirmDialogComponent,
  InputComponent,
  NoteComponent,
  SkeletonComponent,
  StickyBarComponent,
  TextareaComponent,
  ToastService,
} from '@stupa-makers/ui-kit';
import { CustomFieldsEditorComponent } from '../../features/fields/custom-fields-editor.component';

interface TemplateForm {
  name: string;
  description: string;
  notes: string;
  defaultName: string;
  defaultDescription: string;
  defaultQuantity: string;
  defaultManufacturer: string;
  defaultModelNumber: string;
  defaultInsured: boolean;
  defaultLifetimeWarranty: boolean;
  defaultWarrantyDetails: string;
  includePurchaseFields: boolean;
  includeWarrantyFields: boolean;
  includeSoldFields: boolean;
}

/**
 * Edit a template: what it is called and what it fills in for a new item (name,
 * description, quantity, manufacturer, model, location, tags, warranty, custom fields).
 */
@Component({
  selector: 'app-template-edit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    PageHeaderComponent,
    LocationSelectComponent,
    TagPickerComponent,
    CustomFieldsEditorComponent,
    ButtonComponent,
    ButtonLinkComponent,
    CheckboxComponent,
    ConfirmDialogComponent,
    InputComponent,
    NoteComponent,
    SkeletonComponent,
    StickyBarComponent,
    TextareaComponent,
  ],
  templateUrl: './template-edit.component.html',
  styleUrl: './template-edit.component.scss',
})
export class TemplateEditComponent {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);
  private readonly title = inject(AppTitleStrategy);
  private readonly ref = inject(RefDataService);

  readonly id = input.required<string>();

  readonly template = signal<EntityTemplateOut | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly confirmDelete = signal(false);

  form: TemplateForm = this.fill(null);
  readonly locationId = signal('');
  readonly tagIds = signal<readonly string[]>([]);
  readonly fields = signal<TemplateField[]>([]);

  constructor() {
    this.ref.ensureLoaded().subscribe();
    effect(() => this.load(this.id()));
  }

  load(id = this.id()): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.api.template(id).subscribe({
      next: (tpl) => {
        this.template.set(tpl);
        this.form = this.fill(tpl);
        this.locationId.set(tpl.defaultLocation?.id ?? '');
        this.tagIds.set((tpl.defaultTags ?? []).map((t) => t.id));
        this.fields.set(tpl.fields ?? []);
        this.loading.set(false);
        this.title.setPageTitle(tpl.name);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  save(): void {
    const tpl = this.template();
    if (!tpl || this.busy()) return;
    const f = this.form;
    if (!f.name.trim()) {
      this.error.set(this.i18n.translate('create.error.name'));
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.api
      .updateTemplate(tpl.id, {
        id: tpl.id,
        name: f.name.trim(),
        description: f.description,
        notes: f.notes,
        defaultName: f.defaultName || null,
        defaultDescription: f.defaultDescription || null,
        defaultQuantity: Math.max(1, Number(f.defaultQuantity) || 1),
        defaultManufacturer: f.defaultManufacturer || null,
        defaultModelNumber: f.defaultModelNumber || null,
        defaultInsured: f.defaultInsured,
        defaultLifetimeWarranty: f.defaultLifetimeWarranty,
        defaultWarrantyDetails: f.defaultWarrantyDetails || null,
        defaultLocationId: this.locationId() || null,
        defaultTagIds: [...this.tagIds()],
        includePurchaseFields: f.includePurchaseFields,
        includeWarrantyFields: f.includeWarrantyFields,
        includeSoldFields: f.includeSoldFields,
        fields: this.fields()
          .filter((x) => x.name.trim())
          .map((x) => ({ ...x, timeValue: x.timeValue ?? '' })),
      })
      .subscribe({
        next: (saved) => {
          this.busy.set(false);
          this.template.set(saved);
          this.toast.show(this.i18n.translate('common.saved'), 'success');
          void this.router.navigate(['/collection/templates']);
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(errorMessage(err, this.i18n.translate('common.error')));
        },
      });
  }

  delete(): void {
    const tpl = this.template();
    if (!tpl) return;
    this.busy.set(true);
    this.api.deleteTemplate(tpl.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.confirmDelete.set(false);
        this.toast.show(this.i18n.translate('templates.deleted', { name: tpl.name }), 'success');
        void this.router.navigate(['/collection/templates']);
      },
      error: (err) => {
        this.busy.set(false);
        this.confirmDelete.set(false);
        this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger');
      },
    });
  }

  private fill(tpl: EntityTemplateOut | null): TemplateForm {
    return {
      name: tpl?.name ?? '',
      description: tpl?.description ?? '',
      notes: tpl?.notes ?? '',
      defaultName: tpl?.defaultName ?? '',
      defaultDescription: tpl?.defaultDescription ?? '',
      defaultQuantity: String(tpl?.defaultQuantity || 1),
      defaultManufacturer: tpl?.defaultManufacturer ?? '',
      defaultModelNumber: tpl?.defaultModelNumber ?? '',
      defaultInsured: tpl?.defaultInsured ?? false,
      defaultLifetimeWarranty: tpl?.defaultLifetimeWarranty ?? false,
      defaultWarrantyDetails: tpl?.defaultWarrantyDetails ?? '',
      includePurchaseFields: tpl?.includePurchaseFields ?? false,
      includeWarrantyFields: tpl?.includeWarrantyFields ?? false,
      includeSoldFields: tpl?.includeSoldFields ?? false,
    };
  }
}
