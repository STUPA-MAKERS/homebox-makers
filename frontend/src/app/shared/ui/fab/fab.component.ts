import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonComponent, IconComponent, type IconName } from '@stupa-makers/ui-kit';

/**
 * The floating main action of a page (STUPA-Workflow): one per page, at the bottom end of
 * the content, on every width. It is the "new" action of a list, or "Speichern"
 * (`icon="check"`, `[loading]` while the save runs) in an editor.
 *
 * The look is the ui-kit button `variant="fab"`: 56px high, accent surface, the elevated
 * shadow, the icon and the label in one row.
 *
 * - Default: fixed at the end edge of the content column, above the phone bottom bar
 *   (`--app-bottom-inset`).
 * - `contained`: absolute at the bottom end of the nearest positioned ancestor, for a list
 *   pane beside a detail pane (`.ld-pane` is positioned).
 *
 * The button floats over the content, so a list pads the end of its rows by
 * `calc(56px + var(--space-6))`.
 */
@Component({
  selector: 'app-fab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, IconComponent],
  host: {
    class: 'fab',
    '[class.fab--contained]': 'contained()',
  },
  template: `<app-button
    variant="fab"
    [ariaLabel]="label()"
    [loading]="loading()"
    [disabled]="disabled()"
    (click)="onClick()"
  >
    <app-icon [name]="icon()" />{{ label() }}
  </app-button>`,
  styleUrl: './fab.component.scss',
})
export class FabComponent {
  /** The visible text and the accessible name, for example "Gegenstand anlegen". */
  readonly label = input.required<string>();
  readonly icon = input<IconName>('plus');
  /** Absolute in the nearest positioned ancestor instead of fixed in the window. */
  readonly contained = input(false);
  /** The action runs, for example a save: the spinner shows and a click does nothing. */
  readonly loading = input(false);
  readonly disabled = input(false);

  readonly activate = output<void>();

  protected onClick(): void {
    if (!this.loading() && !this.disabled()) this.activate.emit();
  }
}
