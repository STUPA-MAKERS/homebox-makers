import { ChangeDetectionStrategy, Component, computed, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalizedDatePipe } from '@core/i18n/localized-date.pipe';
import { FabComponent } from '@shared/ui/fab/fab.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import {
  ButtonComponent,
  FieldGroupComponent,
  FieldRowComponent,
  FilterSelectComponent,
  IconComponent,
  ListDetailLayoutComponent,
  ListItemComponent,
  RowMenuComponent,
  SheetBarComponent,
  SheetBarTitleDirective,
  StatusTextComponent,
} from '@stupa-makers/ui-kit';
import { inDays, mockSplit } from './mock-frame';

interface Entry {
  id: string;
  name: string;
  item: string;
  place: string;
  due: string;
  cost: string;
  every: string | null;
  group: 'over' | 'soon' | 'later';
}

const ENTRIES: Entry[] = [
  { id: 'a', name: 'Filter wechseln', item: 'Luftreiniger', place: 'Wohnzimmer', due: inDays(-3), cost: '24,90 €', every: 'alle 3 Monate', group: 'over' },
  { id: 'b', name: 'Entkalken', item: 'Kaffeemaschine', place: 'Küche', due: inDays(-12), cost: '6,50 €', every: 'alle 2 Monate', group: 'over' },
  { id: 'c', name: 'Batterien tauschen', item: 'Rauchmelder', place: 'Flur', due: inDays(3), cost: '9,99 €', every: 'jährlich', group: 'soon' },
  { id: 'd', name: 'Kette ölen', item: 'Fahrrad', place: 'Garage', due: inDays(14), cost: '', every: 'alle 6 Wochen', group: 'soon' },
  { id: 'e', name: 'Inspektion', item: 'Heizung', place: 'Keller', due: inDays(80), cost: '149,00 €', every: 'jährlich', group: 'later' },
];

/**
 * Mockup A of the maintenance page: the list pane of the other pages, grouped by when an
 * entry is due, and the entry as a sheet beside it with its history and "Erledigt" as FAB.
 */
@Component({
  selector: 'app-mock-maint-a',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    LocalizedDatePipe,
    FabComponent,
    PageHeaderComponent,
    ButtonComponent,
    FieldGroupComponent,
    FieldRowComponent,
    FilterSelectComponent,
    IconComponent,
    ListDetailLayoutComponent,
    ListItemComponent,
    RowMenuComponent,
    SheetBarComponent,
    SheetBarTitleDirective,
    StatusTextComponent,
  ],
  host: { '[class.pane-page]': 'split()' },
  template: `
    <div class="ma" [class.ma--split]="split()">
      <app-list-detail [detailOpen]="split()">
        <section list class="ld-pane ma__pane" aria-label="Wartung">
          <app-page-header [pane]="true" title="Wartung" />
          <div class="ma__chips" role="group" aria-label="Filter">
            <app-filter-select label="Status" [options]="status" value="open" text="Offen" filled />
            <app-filter-select label="Ort" icon="mappin" [options]="[]" filled />
          </div>
          <p class="ma__sum muted">
            <span class="ma__over">2 überfällig</span> · 3 geplant · 214,90 € Kosten in 2026
          </p>
          <div class="ma__scroll">
            @for (g of groups; track g.key) {
              <section class="ma__group" [attr.aria-label]="g.title">
                <h2 class="sec ma__sec" [class.ma__sec--over]="g.key === 'over'">{{ g.title }}</h2>
                <div class="ma__rows" [class.rowgroup]="!split()">
                  @for (e of byGroup(g.key); track e.id) {
                    <app-list-item
                      [title]="e.name"
                      [sub]="e.item + ' · ' + e.place"
                      [selected]="e.id === selected().id"
                      (click)="selected.set(e)"
                    >
                      <span lead class="ma__icon" [class.ma__icon--over]="e.group === 'over'"
                        ><app-icon name="wrench" [size]="20"
                      /></span>
                      <span trail class="ma__due" [class.ma__due--over]="e.group === 'over'">{{
                        e.group === 'over' ? 'seit ' + ago(e) + ' Tagen' : (e.due | ldate: 'mediumDate')
                      }}</span>
                      <app-row-menu trail label="Aktionen" [sections]="menu" />
                    </app-list-item>
                  }
                </div>
              </section>
            }
          </div>
          <app-fab label="Wartung planen" [contained]="split()" />
        </section>

        <div detail class="ma__detail">
          @if (selected(); as e) {
            <article class="sheet" aria-labelledby="ma-title">
              <header class="sheet-head">
                <app-sheet-bar [bleed]="split()">
                  <h2 appSheetBarTitle id="ma-title" class="sheet-title">{{ e.name }}</h2>
                  <app-button variant="text" [iconOnly]="true" ariaLabel="Bearbeiten"
                    ><app-icon name="edit"
                  /></app-button>
                  <app-row-menu label="Aktionen" [sections]="menu" />
                </app-sheet-bar>
                <p class="sheet-line">
                  <a class="sheet-link" routerLink="/items">{{ e.item }}</a>
                  <span class="sheet-dot" aria-hidden="true">·</span>
                  <span>{{ e.place }}</span>
                  <span class="sheet-dot" aria-hidden="true">·</span>
                  <span>fällig {{ e.due | ldate: 'mediumDate' }}</span>
                  @if (e.group === 'over') {
                    <span class="sheet-dot" aria-hidden="true">·</span>
                    <app-status-text kind="warn">überfällig seit {{ ago(e) }} Tagen</app-status-text>
                  }
                </p>
              </header>
              <div class="sheet-cols">
                <div class="sheet-col">
                  <section class="sheet-sec" aria-labelledby="ma-facts">
                    <h3 class="sec" id="ma-facts">Details</h3>
                    <app-field-group>
                      <div class="sheet-pair">
                        <app-field-row label="Fällig" [value]="e.due | ldate: 'mediumDate'" />
                        <app-field-row label="Wiederholung" [value]="e.every" />
                      </div>
                      <div class="sheet-pair">
                        <app-field-row label="Geschätzte Kosten" [value]="e.cost || '–'" [mono]="true" />
                        <app-field-row label="Zuletzt erledigt" [value]="lastDone | ldate: 'mediumDate'" />
                      </div>
                    </app-field-group>
                  </section>
                  <section class="sheet-sec" aria-labelledby="ma-note">
                    <h3 class="sec" id="ma-note">Notiz</h3>
                    <p class="ma__note">HEPA-Filter H13. Ersatz liegt im Abstellraum, zweites Regal. Vorfilter vorher absaugen.</p>
                  </section>
                </div>
                <div class="sheet-col">
                  <section class="sheet-sec" aria-labelledby="ma-hist">
                    <h3 class="sec" id="ma-hist">Verlauf <span class="muted num">3</span></h3>
                    <div class="rowgroup">
                      @for (h of history; track h.date) {
                        <app-list-item [title]="'Erledigt am ' + (h.date | ldate: 'mediumDate')" [sub]="h.note">
                          <span lead class="ma__icon ma__icon--done"><app-icon name="circleok" [size]="20" /></span>
                          <span trail class="num">{{ h.cost }}</span>
                        </app-list-item>
                      }
                    </div>
                  </section>
                </div>
              </div>
            </article>
            <app-fab icon="check" label="Als erledigt markieren" [contained]="split()" />
          }
        </div>
      </app-list-detail>
    </div>
  `,
  styleUrl: './maint-a.component.scss',
})
export class MockMaintAComponent {
  private readonly layout = viewChild(ListDetailLayoutComponent);
  readonly split = mockSplit(this.layout);
  readonly status = [
    { value: 'open', label: 'Offen' },
    { value: 'done', label: 'Erledigt' },
    { value: 'all', label: 'Alle' },
  ];
  readonly groups = [
    { key: 'over', title: 'Überfällig' },
    { key: 'soon', title: 'Nächste 30 Tage' },
    { key: 'later', title: 'Später' },
  ] as const;
  readonly menu = [
    { items: [{ id: 'done', label: 'Als erledigt markieren', icon: 'check' as const }, { id: 'edit', label: 'Bearbeiten', icon: 'edit' as const }] },
    { items: [{ id: 'del', label: 'Löschen', icon: 'trash' as const, danger: true }] },
  ];
  readonly selected = signal<Entry>(ENTRIES[0]);
  readonly lastDone = inDays(-95);
  readonly history = [
    { date: inDays(-95), cost: '24,90 €', note: 'Filter H13 von Amazon' },
    { date: inDays(-186), cost: '24,90 €', note: null },
    { date: inDays(-280), cost: '19,90 €', note: 'Vorfilter gereinigt' },
  ];
  readonly entries = computed(() => ENTRIES);

  byGroup(g: Entry['group']): Entry[] {
    return ENTRIES.filter((e) => e.group === g);
  }
  ago(e: Entry): number {
    return Math.round((Date.now() - new Date(e.due).getTime()) / 86_400_000);
  }
}
