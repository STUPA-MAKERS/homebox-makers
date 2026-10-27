import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { RefDataService } from '@core/data/ref-data.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { SelectFieldComponent, type SelectFieldOption } from '@stupa-makers/ui-kit';

/** A select of the locations of the collection, labelled with their full path. */
@Component({
  selector: 'app-location-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, SelectFieldComponent],
  template: `
    <app-select
      [label]="label() || ('location.label' | t)"
      [placeholder]="placeholder() || ('location.choose' | t)"
      [options]="options()"
      [required]="required()"
      [clearable]="!required()"
      [error]="error()"
      [(value)]="value"
    />
  `,
})
export class LocationSelectComponent {
  private readonly ref = inject(RefDataService);

  readonly value = model('');
  readonly label = input<string | null>(null);
  readonly placeholder = input<string | null>(null);
  readonly required = input(false);
  readonly error = input('');
  /** A location that may not be chosen (the location itself, as its own parent). */
  readonly exclude = input<string | null>(null);

  readonly options = computed<SelectFieldOption[]>(() =>
    this.ref
      .locationOptions()
      .filter((l) => l.id !== this.exclude())
      .map((l) => ({ value: l.id, label: l.path })),
  );
}
