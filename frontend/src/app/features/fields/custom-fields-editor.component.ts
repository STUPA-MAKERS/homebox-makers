import { ChangeDetectionStrategy, Component, computed, inject, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import {
  ButtonComponent,
  CheckboxComponent,
  IconComponent,
  InputComponent,
  SelectFieldComponent,
  type SelectFieldOption,
} from '@stupa-makers/ui-kit';

/** What an item and a template have in common about a custom field. */
export interface CustomField {
  id: string;
  name: string;
  type: string;
  textValue: string;
  numberValue: number;
  booleanValue: boolean;
}

/**
 * The custom fields of an item or a template: name, type (text, number, yes/no) and value
 * per row, with "Feld hinzufügen" and remove.
 */
@Component({
  selector: 'app-custom-fields-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonComponent,
    CheckboxComponent,
    IconComponent,
    InputComponent,
    SelectFieldComponent,
  ],
  template: `
    <div class="cf__head">
      <h2 class="section-title">{{ 'item.customFields' | t }}</h2>
      <app-button variant="tonal" size="sm" (click)="add()">
        <span class="btn-label"><app-icon name="plus" />{{ 'item.addField' | t }}</span>
      </app-button>
    </div>
    @for (f of fields(); track $index; let i = $index) {
      <div class="cf__row">
        <app-input
          [name]="'fname' + i"
          [label]="'field.name' | t"
          [ngModel]="f.name"
          (ngModelChange)="update(i, { name: $event })"
        />
        <app-select
          [label]="'field.type' | t"
          [options]="typeOptions()"
          [clearable]="false"
          [value]="f.type"
          (valueChange)="update(i, { type: $event })"
        />
        @switch (f.type) {
          @case ('boolean') {
            <app-checkbox
              [name]="'fbool' + i"
              [ngModel]="f.booleanValue"
              (ngModelChange)="update(i, { booleanValue: $event })"
              >{{ 'item.field.value' | t }}</app-checkbox
            >
          }
          @case ('number') {
            <app-input
              [name]="'fnum' + i"
              type="number"
              [label]="'item.field.value' | t"
              [ngModel]="'' + f.numberValue"
              (ngModelChange)="update(i, { numberValue: +$event })"
            />
          }
          @default {
            <app-input
              [name]="'ftext' + i"
              [label]="'item.field.value' | t"
              [ngModel]="f.textValue"
              (ngModelChange)="update(i, { textValue: $event })"
            />
          }
        }
        <app-button
          variant="text"
          [iconOnly]="true"
          [ariaLabel]="'common.remove' | t"
          (click)="remove(i)"
        >
          <app-icon name="trash" />
        </app-button>
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .cf__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }
    .cf__head .section-title {
      margin: 0;
    }
    .cf__row {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 2fr) auto;
      align-items: center;
      gap: var(--space-3);
    }
    @media (max-width: 599px) {
      .cf__row {
        grid-template-columns: minmax(0, 1fr) auto;
      }
    }
  `,
})
export class CustomFieldsEditorComponent<T extends CustomField = CustomField> {
  private readonly i18n = inject(I18nService);

  readonly fields = model<T[]>([]);

  readonly typeOptions = computed<SelectFieldOption[]>(() => [
    { value: 'text', label: this.i18n.translate('item.field.text') },
    { value: 'number', label: this.i18n.translate('item.field.number') },
    { value: 'boolean', label: this.i18n.translate('item.field.boolean') },
  ]);

  add(): void {
    const blank = {
      id: '',
      name: '',
      type: 'text',
      textValue: '',
      numberValue: 0,
      booleanValue: false,
    };
    this.fields.update((f) => [...f, blank as T]);
  }

  remove(index: number): void {
    this.fields.update((f) => f.filter((_, i) => i !== index));
  }

  update(index: number, patch: Partial<CustomField>): void {
    this.fields.update((f) => f.map((x, i) => (i === index ? { ...x, ...patch } : x)));
  }
}
