import {
  ChangeDetectionStrategy,
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
import type { EntityOut } from '@core/api/models';
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
 * description and optional photos. An item needs a location; a location may sit at the top.
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

  readonly request = this.create.request;
  readonly isLocation = computed(() => this.request()?.kind === 'location');

  name = '';
  quantity = '1';
  description = '';
  readonly typeId = signal('');
  readonly parentId = signal('');
  readonly tagIds = signal<readonly string[]>([]);
  readonly photos = signal<File[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly typeOptions = computed<SelectFieldOption[]>(() =>
    (this.isLocation() ? this.ref.locationTypes() : this.ref.itemTypes()).map((t) => ({
      value: t.id,
      label: t.name,
    })),
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
          .subscribe(() => this.typeId.set(this.typeOptions()[0]?.value ?? ''));
      });
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
    this.api
      .createEntity({
        name: this.name.trim(),
        description: this.description,
        entityTypeId: this.typeId(),
        parentId: this.parentId() || null,
        quantity: location ? 1 : Math.max(1, Number(this.quantity) || 1),
        tagIds: [...this.tagIds()],
      })
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
    this.error.set(null);
    this.busy.set(false);
  }
}
