import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient } from '@core/api/api-client.service';
import type { EntityFieldData, EntityOut, EntityUpdate } from '@core/api/models';
import { RefDataService } from '@core/data/ref-data.service';
import { I18nService } from '@core/i18n/i18n.service';
import { apiDate } from '@core/i18n/localized-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { isLocation } from '@shared/entity.util';
import { CustomFieldsEditorComponent } from '../../features/fields/custom-fields-editor.component';
import { errorMessage } from '@shared/http-error';
import { LocationSelectComponent } from '@shared/ui/location-select/location-select.component';
import { FabComponent } from '@shared/ui/fab/fab.component';
import { TagPickerComponent } from '@shared/ui/tag-picker/tag-picker.component';
import {
  ButtonComponent,
  CheckboxComponent,
  CurrencyInputComponent,
  DatepickerComponent,
  IconComponent,
  InputComponent,
  NoteComponent,
  SelectFieldComponent,
  type SelectFieldOption,
  SkeletonComponent,
  SheetBarComponent,
  SheetBarTitleDirective,
  TextareaComponent,
  ToastService,
} from '@stupa-makers/ui-kit';

/** The form model: the API shape with strings for the number and date fields. */
interface ItemForm {
  name: string;
  description: string;
  quantity: string;
  assetId: string;
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  insured: boolean;
  archived: boolean;
  notes: string;
  purchaseFrom: string;
  purchasePrice: string;
  purchaseDate: string;
  lifetimeWarranty: boolean;
  warrantyExpires: string;
  warrantyDetails: string;
  soldTo: string;
  soldPrice: string;
  soldDate: string;
  soldNotes: string;
  syncChildEntityLocations: boolean;
}

/** `YYYY-MM-DD` of an API date, `''` when unset. */
function day(value: string | Date | null | undefined): string {
  const d = apiDate(value);
  if (!d) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** A form date for the API: midnight UTC of the day, or the zero time for no date. */
function apiDay(value: string): string {
  return value ? `${value}T00:00:00Z` : '0001-01-01T00:00:00Z';
}

function money(value: number | null | undefined): string {
  return value ? String(value) : '';
}

/**
 * Edit every field of an item: the basics, the identification, the purchase, the warranty,
 * the sale, the custom fields, the location and the tags. The sticky bar keeps "Speichern"
 * in reach on a long form.
 */
@Component({
  selector: 'app-item-edit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    FabComponent,
    SheetBarComponent,
    SheetBarTitleDirective,
    IconComponent,
    LocationSelectComponent,
    TagPickerComponent,
    ButtonComponent,
    CheckboxComponent,
    CustomFieldsEditorComponent,
    CurrencyInputComponent,
    DatepickerComponent,
    InputComponent,
    NoteComponent,
    SelectFieldComponent,
    SkeletonComponent,
    TextareaComponent,
  ],
  templateUrl: './item-edit.component.html',
  styleUrl: './item-edit.component.scss',
})
export class ItemEditComponent {
  private readonly api = inject(ApiClient);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);
  readonly ref = inject(RefDataService);

  readonly id = input.required<string>();
  /** The saved entity, or null when the editor closes without saving. */
  readonly done = output<EntityOut | null>();

  readonly item = signal<EntityOut | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  form: ItemForm = this.emptyForm();
  readonly typeId = signal('');
  readonly parentId = signal('');
  readonly tagIds = signal<readonly string[]>([]);
  readonly fields = signal<EntityFieldData[]>([]);

  /** A location is edited here too, with the item-only sections left out. */
  readonly isLoc = computed(() => {
    const item = this.item();
    return !!item && isLocation(item);
  });

  readonly typeOptions = computed<SelectFieldOption[]>(() =>
    (this.isLoc() ? this.ref.locationTypes() : this.ref.itemTypes()).map((t) => ({
      value: t.id,
      label: t.name,
    })),
  );
  constructor() {
    this.ref.ensureLoaded().subscribe();
    effect(() => this.load(this.id()));
  }

  load(id: string): void {
    this.loading.set(true);
    this.api.entity(id).subscribe({
      next: (item) => {
        this.item.set(item);
        this.fill(item);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(errorMessage(err, this.i18n.translate('common.loadError')));
      },
    });
  }

  save(): void {
    const item = this.item();
    if (!item || this.busy()) return;
    const f = this.form;
    if (!f.name.trim()) {
      this.error.set(this.i18n.translate('create.error.name'));
      return;
    }
    const body: EntityUpdate = {
      id: item.id,
      name: f.name.trim(),
      description: f.description,
      quantity: Math.max(0, Number(f.quantity) || 0),
      assetId: f.assetId,
      manufacturer: f.manufacturer,
      modelNumber: f.modelNumber,
      serialNumber: f.serialNumber,
      insured: f.insured,
      archived: f.archived,
      notes: f.notes,
      purchaseFrom: f.purchaseFrom,
      purchasePrice: f.purchasePrice ? Number(f.purchasePrice) : 0,
      purchaseDate: apiDay(f.purchaseDate),
      lifetimeWarranty: f.lifetimeWarranty,
      warrantyExpires: apiDay(f.warrantyExpires),
      warrantyDetails: f.warrantyDetails,
      soldTo: f.soldTo,
      soldPrice: f.soldPrice ? Number(f.soldPrice) : 0,
      soldDate: apiDay(f.soldDate),
      soldNotes: f.soldNotes,
      syncChildEntityLocations: f.syncChildEntityLocations,
      entityTypeId: this.typeId() || item.entityType?.id || '',
      parentId: this.parentId() || null,
      tagIds: [...this.tagIds()],
      fields: this.fields().filter((x) => x.name.trim()),
    };
    this.error.set(null);
    this.busy.set(true);
    this.api.updateEntity(item.id, body).subscribe({
      next: (saved) => {
        this.busy.set(false);
        this.toast.show(this.i18n.translate('common.saved'), 'success');
        this.done.emit(saved);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err, this.i18n.translate('common.error')));
      },
    });
  }

  private fill(item: EntityOut): void {
    this.form = {
      name: item.name,
      description: item.description,
      quantity: String(item.quantity),
      assetId: item.assetId,
      manufacturer: item.manufacturer,
      modelNumber: item.modelNumber,
      serialNumber: item.serialNumber,
      insured: item.insured,
      archived: item.archived,
      notes: item.notes,
      purchaseFrom: item.purchaseFrom,
      purchasePrice: money(item.purchasePrice),
      purchaseDate: day(item.purchaseDate),
      lifetimeWarranty: item.lifetimeWarranty,
      warrantyExpires: day(item.warrantyExpires),
      warrantyDetails: item.warrantyDetails,
      soldTo: item.soldTo,
      soldPrice: money(item.soldPrice),
      soldDate: day(item.soldDate),
      soldNotes: item.soldNotes,
      syncChildEntityLocations: item.syncChildEntityLocations,
    };
    this.typeId.set(item.entityType?.id ?? '');
    this.parentId.set(item.parent?.id ?? '');
    this.tagIds.set(item.tags.map((t) => t.id));
    this.fields.set(item.fields ?? []);
  }

  private emptyForm(): ItemForm {
    return {
      name: '',
      description: '',
      quantity: '1',
      assetId: '',
      manufacturer: '',
      modelNumber: '',
      serialNumber: '',
      insured: false,
      archived: false,
      notes: '',
      purchaseFrom: '',
      purchasePrice: '',
      purchaseDate: '',
      lifetimeWarranty: false,
      warrantyExpires: '',
      warrantyDetails: '',
      soldTo: '',
      soldPrice: '',
      soldDate: '',
      soldNotes: '',
      syncChildEntityLocations: false,
    };
  }
}
