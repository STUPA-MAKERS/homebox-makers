import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { type Observable, concatMap, from, last, of, switchMap } from 'rxjs';
import { ApiClient } from '@core/api/api-client.service';
import type { EntityOut, EntityTemplateSummary } from '@core/api/models';
import { RefDataService } from '@core/data/ref-data.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { errorMessage } from '@shared/http-error';
import { LocationSelectComponent } from '@shared/ui/location-select/location-select.component';
import { TagPickerComponent } from '@shared/ui/tag-picker/tag-picker.component';
import {
  ButtonComponent,
  DialogComponent,
  FilePickerComponent,
  IconComponent,
  InputComponent,
  NoteComponent,
  SelectFieldComponent,
  type SelectFieldOption,
  TextareaComponent,
  ToastService,
} from '@stupa-makers/ui-kit';
import { CreateService } from './create.service';

/**
 * The create dialog of the app: a new item or location with name, type, place, tags,
 * description and optional photos. A new item can start from a template: the type's
 * default template is preselected, a chosen template fills in its defaults, and the server
 * creates the item from it (custom fields, manufacturer, warranty and so on). An item needs a location; a location may sit at the top.
 * After the save the dialog opens the new entity, or stays open for the next one
 * ("Speichern & weiter").
 */
@Component({
  selector: 'app-create-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    DialogComponent,
    InputComponent,
    TextareaComponent,
    SelectFieldComponent,
    ButtonComponent,
    IconComponent,
    NoteComponent,
    FilePickerComponent,
    LocationSelectComponent,
    TagPickerComponent,
  ],
  templateUrl: './create-dialog.component.html',
  styleUrl: './create-dialog.component.scss',
})
export class CreateDialogComponent {
  private readonly api = inject(ApiClient);
  private readonly ref = inject(RefDataService);
  private readonly create = inject(CreateService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly request = this.create.request;
  readonly isLocation = computed(() => this.request()?.kind === 'location');

  name = '';
  quantity = '1';
  description = '';
  readonly typeId = signal('');
  readonly parentId = signal('');
  readonly tagIds = signal<readonly string[]>([]);
  readonly photos = signal<File[]>([]);
  readonly templates = signal<EntityTemplateSummary[]>([]);
  readonly templateId = signal('');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly typeOptions = computed<SelectFieldOption[]>(() =>
    (this.isLocation() ? this.ref.locationTypes() : this.ref.itemTypes()).map((t) => ({
      value: t.id,
      label: t.name,
    })),
  );

  readonly templateOptions = computed<SelectFieldOption[]>(() =>
    [...this.templates()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => ({ value: t.id, label: t.name })),
  );

  constructor() {
    effect(() => {
      const req = this.request();
      if (!req) return;
      untracked(() => {
        this.reset();
        this.parentId.set(req.parentId ?? '');
        this.tagIds.set(req.tagId ? [req.tagId] : []);
        this.ref
          .ensureLoaded()
          .subscribe(() => this.setType(this.typeOptions()[0]?.value ?? ''));
        if (req.kind === 'item') {
          this.api.templates().subscribe({
            next: (all) => this.templates.set(all ?? []),
            error: () => this.templates.set([]),
          });
        }
      });
    });
  }

  /** A new item type preselects its default template. */
  setType(id: string): void {
    this.typeId.set(id);
    if (this.isLocation()) return;
    const type = this.ref.itemTypes().find((t) => t.id === id);
    if (type?.defaultTemplateId) this.setTemplate(type.defaultTemplateId);
  }

  /** A chosen template fills in its defaults; what the user already typed stays. */
  setTemplate(id: string): void {
    this.templateId.set(id);
    if (!id) return;
    this.api.template(id).subscribe((tpl) => {
      if (this.templateId() !== id) return;
      if (!this.name.trim() && tpl.defaultName) this.name = tpl.defaultName;
      if (!this.description.trim() && tpl.defaultDescription) {
        this.description = tpl.defaultDescription;
      }
      if (tpl.defaultQuantity > 0) this.quantity = String(tpl.defaultQuantity);
      if (!this.parentId() && tpl.defaultLocation?.id) this.parentId.set(tpl.defaultLocation.id);
      const tags = (tpl.defaultTags ?? []).map((t) => t.id);
      if (tags.length) this.tagIds.update((cur) => [...new Set([...cur, ...tags])]);
      // The text fields are plain ngModel fields, not signals.
      this.cdr.markForCheck();
    });
  }

  close(): void {
    this.create.close();
  }

  addPhotos(files: File[]): void {
    this.photos.update((p) => [...p, ...files]);
  }

  removePhoto(index: number): void {
    this.photos.update((p) => p.filter((_, i) => i !== index));
  }

  save(andNext = false): void {
    if (this.busy()) return;
    const location = this.isLocation();
    if (!this.name.trim()) {
      this.error.set(this.i18n.translate('create.error.name'));
      return;
    }
    if (!this.typeId()) {
      this.error.set(this.i18n.translate('create.error.type'));
      return;
    }
    if (!location && !this.parentId()) {
      this.error.set(this.i18n.translate('create.error.location'));
      return;
    }
    this.error.set(null);
    this.busy.set(true);
    const body = {
      name: this.name.trim(),
      description: this.description,
      entityTypeId: this.typeId(),
      quantity: location ? 1 : Math.max(1, Number(this.quantity) || 1),
      tagIds: [...this.tagIds()],
    };
    const templateId = location ? '' : this.templateId();
    const created = templateId
      ? this.api.createFromTemplate(templateId, { ...body, parentId: this.parentId() })
      : this.api.createEntity({ ...body, parentId: this.parentId() || null });
    created
      .pipe(switchMap((entity) => this.uploadPhotos(entity)))
      .subscribe({
        next: (entity) => {
          this.busy.set(false);
          this.toast.show(this.i18n.translate('create.done', { name: entity.name }), 'success');
          this.create.created.next(entity);
          if (location) this.ref.reload().subscribe();
          if (andNext) {
            this.name = '';
            this.description = '';
            this.quantity = '1';
            this.photos.set([]);
            return;
          }
          this.close();
          void this.router.navigate([location ? '/locations' : '/items', entity.id]);
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(errorMessage(err, this.i18n.translate('create.error.save')));
        },
      });
  }

  /** Upload the photos one after the other; the first one is the primary photo. */
  private uploadPhotos(entity: EntityOut): Observable<EntityOut> {
    const files = this.photos();
    if (!files.length) return of(entity);
    return from(files).pipe(
      concatMap((file, i) => this.api.addAttachment(entity.id, file, file.name, 'photo', i === 0)),
      last(),
    );
  }

  private reset(): void {
    this.name = '';
    this.quantity = '1';
    this.description = '';
    this.photos.set([]);
    this.templateId.set('');
    this.error.set(null);
    this.busy.set(false);
  }
}
