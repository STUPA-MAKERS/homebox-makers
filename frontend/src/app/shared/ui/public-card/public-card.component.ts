import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The card of a public page (login, registration, password reset): the Homebox mark, a
 * title and a subtitle above the projected form, centred on the page background.
 */
@Component({
  selector: 'app-public-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="pc" [attr.aria-labelledby]="'pc-title'">
      <img class="pc__mark mark-light" src="mark-light.svg" alt="" width="48" height="48" />
      <img class="pc__mark mark-dark" src="mark-dark.svg" alt="" width="48" height="48" />
      <h1 class="pc__title" id="pc-title">{{ title() }}</h1>
      @if (subtitle()) {
        <p class="pc__sub">{{ subtitle() }}</p>
      }
      <div class="pc__body"><ng-content /></div>
      <div class="pc__foot"><ng-content select="[foot]" /></div>
    </section>
  `,
  styles: `
    :host {
      display: flex;
      justify-content: center;
      width: 100%;
      padding-block: var(--space-6);
    }
    .pc {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      width: 100%;
      max-width: 26rem;
      padding: var(--space-6);
      border-radius: var(--radius-lg);
      background: var(--color-surface-1);
      box-shadow: var(--shadow-sm);
    }
    .pc__mark {
      width: 48px;
      height: 48px;
      margin-bottom: var(--space-2);
    }
    .pc__title {
      margin: 0;
      font-size: var(--fs-d2);
      line-height: var(--lh-d2);
      font-weight: var(--fw-semibold);
      letter-spacing: var(--tracking-tight);
    }
    .pc__sub {
      margin: 0;
      color: var(--color-text-muted);
    }
    .pc__body {
      margin-top: var(--space-4);
    }
    .pc__foot:empty {
      display: none;
    }
    .pc__foot {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin-top: var(--space-4);
      padding-top: var(--space-4);
      border-top: var(--border-width) solid var(--color-border);
      font-size: var(--fs-sm);
      color: var(--color-text-muted);
    }
    @media (max-width: 480px) {
      .pc {
        padding: var(--space-5) var(--space-4);
      }
    }
  `,
})
export class PublicCardComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
}
