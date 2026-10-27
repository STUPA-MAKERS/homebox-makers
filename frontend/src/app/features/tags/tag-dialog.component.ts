import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiClient } from '@core/api/api-client.service';
import type { TagOut } from '@core/api/models';
import { RefDataService } from '@core/data/ref-data.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { errorMessage } from '@shared/http-error';
import {
  ButtonComponent,
  DialogComponent,
  InputComponent,
  NoteComponent,
  SelectFieldComponent,
  type SelectFieldOption,
  TextareaComponent,
} from '@stupa-makers/ui-kit';

/** The colours a tag can take; the empty one is the accent colour of the theme. */
export const TAG_COLORS = [
  '',
  '#e5484d',
  '#f76b15',
  '#ffc53d',
  '#46a758',
  '#12a594',
  '#0090ff',
  '#6e56cf',
  '#d6409f',
  '#8d8d8d',
] as const;

/**
 * Create or edit a tag: name, description, colour and a parent tag. `tag` null with `open`
 * creates one; `saved` emits the stored tag.
 */
@Component({
  selector: 'app-tag-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonComponent,
    DialogComponent,
    InputComponent,
    NoteComponent,
    SelectFieldComponent,
    TextareaComponent,
  ],
  template: `
    <app-dialog
      [open]="open()"
      size="form"
      [title]="(tag() ? 'tag.edit' : 'tag.new') | t"
      [closeLabel]="'common.close' | t"
      (closed)="closed.emit()"
    >
      <form class="form-stack" (ngSubmit)="save()" novalidate>
        <app-input name="name" [label]="'field.name' | t" [required]="true" [(ngModel)]="name" />
        <app-textarea [label]="'field.description' | t">
          <textarea name="description" rows="2" [(ngModel)]="description"></textarea>
        </app-textarea>
        <fieldset class="td__colors">
          <legend class="td__legend">{{ 'tag.color' | t }}</legend>
          @for (c of colors; track c) {
            <button
              type="button"
              class="td__swatch"
              [class.td__swatch--on]="color() === c"
              [style.background]="c || null"
              [attr.aria-pressed]="color() === c"
              [attr.aria-label]="c ? c : ('tag.colorDefault' | t)"
              (click)="color.set(c)"
            ></button>
          }
        </fieldset>
        <app-select
          [label]="'tag.parent' | t"
          [placeholder]="'tag.noParent' | t"
          [options]="parentOptions()"
          [value]="parentId()"
          (valueChange)="parentId.set($event)"
        />
        @if (error()) {
          <app-note kind="error" icon="alert">{{ error() }}</app-note>
        }
      </form>
      <div dialog-footer>
        <app-button variant="text" (click)="closed.emit()">{{ 'common.cancel' | t }}</app-button>
        <app-button [loading]="busy()" (click)="save()">{{
          (tag() ? 'common.save' : 'common.create') | t
        }}</app-button>
      </div>
    </app-dialog>
  `,
  styles: `
    .td__colors {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      border: 0;
    }
    .td__legend {
      width: 100%;
      margin-bottom: var(--space-2);
      font-size: var(--fs-small);
      font-weight: var(--fw-medium);
      color: var(--color-text-muted);
    }
    .td__swatch {
      width: 32px;
      height: 32px;
      padding: 0;
      border: 2px solid transparent;
      border-radius: 50%;
      background: var(--color-accent);
      box-shadow: inset 0 0 0 2px var(--color-surface-1);
      cursor: pointer;
    }
    .td__swatch--on {
      border-color: var(--color-text);
    }
    .td__swatch:focus-visible {
      outline: 2px solid var(--color-focus-ring);
      outline-offset: 2px;
    }
  `,
})
export class TagDialogComponent {
  private readonly api = inject(ApiClient);
  private readonly i18n = inject(I18nService);
  private readonly ref = inject(RefDataService);

  readonly open = input(false);
  /** The tag to edit, or null for a new one. */
  readonly tag = input<TagOut | null>(null);
  /** The parent of a new tag. */
  readonly parent = input<string | null>(null);
  readonly closed = output<void>();
  readonly saved = output<TagOut>();

  readonly colors = TAG_COLORS;
  name = '';
  description = '';
  readonly color = signal('');
  readonly parentId = signal('');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  /** Every tag but the tag itself and its descendants (no cycle). */
  readonly parentOptions = computed<SelectFieldOption[]>(() => {
    const self = this.tag()?.id;
    const all = this.ref.tags();
    const blocked = new Set<string>();
    if (self) {
      blocked.add(self);
      let grew = true;
      while (grew) {
        grew = false;
        for (const t of all) {
          if (t.parentId && blocked.has(t.parentId) && !blocked.has(t.id)) {
            blocked.add(t.id);
            grew = true;
          }
        }
      }
    }
    return all
      .filter((t) => !blocked.has(t.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => ({ value: t.id, label: t.name }));
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const tag = this.tag();
      const parent = this.parent();
      untracked(() => {
        this.name = tag?.name ?? '';
        this.description = tag?.description ?? '';
        this.color.set(tag?.color ?? '');
        this.parentId.set(tag?.parentId ?? tag?.parent?.id ?? parent ?? '');
        this.error.set(null);
      });
    });
  }

  save(): void {
    if (this.busy()) return;
    const name = this.name.trim();
    if (!name) {
      this.error.set(this.i18n.translate('create.error.name'));
      return;
    }
    const tag = this.tag();
    const body = {
      name,
      description: this.description.trim(),
      color: this.color(),
      icon: tag?.icon ?? '',
      parentId: this.parentId() || null,
    };
    this.busy.set(true);
    this.error.set(null);
    const req = tag
      ? this.api.updateTag(tag.id, { ...body, id: tag.id })
      : this.api.createTag(body);
    req.subscribe({
      next: (saved) => {
        this.busy.set(false);
        this.ref.reload().subscribe();
        this.saved.emit(saved);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err, this.i18n.translate('common.error')));
      },
    });
  }
}
