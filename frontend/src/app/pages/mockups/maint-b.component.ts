import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FabComponent } from '@shared/ui/fab/fab.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import {
  ButtonComponent,
  DateBlockComponent,
  IconComponent,
  ListItemComponent,
  SegmentedComponent,
} from '@stupa-makers/ui-kit';
import { inDays } from './mock-frame';

interface Row {
  name: string;
  sub: string;
  date: string;
  cost?: string;
  done?: boolean;
}

/**
 * Mockup B of the maintenance page: one agenda over the whole width, like the meeting list
 * of STUPA-Workflow. A date block leads each row, the overdue ones come first, then a group
 * per month; a row opens the entry in the side pane, the round button marks it done.
 */
@Component({
  selector: 'app-mock-maint-b',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FabComponent,
    PageHeaderComponent,
    ButtonComponent,
    DateBlockComponent,
    IconComponent,
    ListItemComponent,
    SegmentedComponent,
  ],
  template: `
    <div class="page page--wide mb">
      <app-page-header title="Wartung">
        <ng-container ngProjectAs="[actions]">
          <app-segmented ariaLabel="Ansicht" [options]="views" value="open" />
        </ng-container>
      </app-page-header>

      <section class="mb__stats" aria-label="Überblick">
        <a class="stat stat--link mb__stat--over" href="#over">
          <span class="stat__icon"><app-icon name="alert" [size]="20" /></span>
          <span class="stat__value num">2</span>
          <span class="stat__label">Überfällig</span>
        </a>
        <div class="stat">
          <span class="stat__icon"><app-icon name="cal" [size]="20" /></span>
          <span class="stat__value num">3</span>
          <span class="stat__label">In den nächsten 30 Tagen</span>
        </div>
        <div class="stat">
          <span class="stat__icon"><app-icon name="euro" [size]="20" /></span>
          <span class="stat__value num">214,90 €</span>
          <span class="stat__label">Kosten in 2026</span>
        </div>
      </section>

      @for (g of groups; track g.title) {
        <section class="mb__group" [attr.id]="g.id" [attr.aria-label]="g.title">
          <h2 class="sec" [class.mb__over]="g.id === 'over'">{{ g.title }}</h2>
          <div class="rowgroup">
            @for (r of g.rows; track r.name) {
              <app-list-item [title]="r.name" [sub]="r.sub" [link]="['/mockups/maintenance-b']">
                <app-date-block lead [date]="r.date" [muted]="!!r.done" />
                @if (r.cost) {
                  <span trail class="mb__cost num">{{ r.cost }}</span>
                }
                <app-button
                  trail
                  variant="text"
                  [iconOnly]="true"
                  [ariaLabel]="r.done ? 'Erledigt' : 'Als erledigt markieren'"
                  [title]="r.done ? 'Erledigt' : 'Als erledigt markieren'"
                  ><span class="mb__check" [class.mb__check--on]="r.done"
                    ><app-icon name="check" [size]="16" /></span
                ></app-button>
              </app-list-item>
            }
          </div>
        </section>
      }

      <app-fab label="Wartung planen" />
    </div>
  `,
  styles: `
    .mb {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      padding-bottom: calc(56px + var(--space-8));
    }
    .mb__stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
      gap: var(--space-3);
    }
    .mb__stat--over {
      background: var(--color-warning-subtle);
    }
    .mb__stat--over .stat__icon,
    .mb__stat--over .stat__value {
      color: var(--color-warning);
    }
    .mb__stat--over .stat__icon {
      background: color-mix(in srgb, var(--color-warning) 18%, transparent);
    }
    .mb__group {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .mb__over {
      color: var(--color-warning);
    }
    .mb__cost {
      pointer-events: none;
      color: var(--color-text-muted);
      font-size: var(--fs-small);
    }
    .mb__check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border: 1.5px solid var(--color-border-strong, var(--color-border));
      border-radius: 50%;
      color: transparent;
    }
    .mb__check--on {
      border-color: var(--color-accent);
      background: var(--color-accent);
      color: var(--color-on-accent, #fff);
    }
    :host ::ng-deep app-button:hover .mb__check:not(.mb__check--on) {
      border-color: var(--color-accent);
      color: var(--color-accent-text);
    }
  `,
})
export class MockMaintBComponent {
  readonly views = [
    { value: 'open', label: 'Offen' },
    { value: 'done', label: 'Erledigt' },
    { value: 'all', label: 'Alle' },
  ];
  readonly groups: { id: string; title: string; rows: Row[] }[] = [
    {
      id: 'over',
      title: 'Überfällig',
      rows: [
        { name: 'Entkalken', sub: 'Kaffeemaschine · Küche · seit 12 Tagen', date: inDays(-12), cost: '6,50 €' },
        { name: 'Filter wechseln', sub: 'Luftreiniger · Wohnzimmer · seit 3 Tagen', date: inDays(-3), cost: '24,90 €' },
      ],
    },
    {
      id: 'soon',
      title: 'Nächste 30 Tage',
      rows: [
        { name: 'Batterien tauschen', sub: 'Rauchmelder · Flur · jährlich', date: inDays(3), cost: '9,99 €' },
        { name: 'Kette ölen', sub: 'Fahrrad · Garage · alle 6 Wochen', date: inDays(14) },
        { name: 'Reifendruck prüfen', sub: 'Auto · Garage', date: inDays(25) },
      ],
    },
    {
      id: 'later',
      title: 'Später',
      rows: [{ name: 'Inspektion', sub: 'Heizung · Keller · jährlich', date: inDays(80), cost: '149,00 €' }],
    },
    {
      id: 'done',
      title: 'Zuletzt erledigt',
      rows: [
        { name: 'Öl prüfen', sub: 'Rasenmäher · Schuppen', date: inDays(-20), done: true },
        { name: 'Dichtung tauschen', sub: 'Waschmaschine · Bad', date: inDays(-41), cost: '12,00 €', done: true },
      ],
    },
  ];
}
