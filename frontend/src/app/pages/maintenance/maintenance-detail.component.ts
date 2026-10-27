import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { MaintenanceEntryWithDetails } from '@core/api/models';
import { I18nService } from '@core/i18n/i18n.service';
import { LocalizedDatePipe, apiDate } from '@core/i18n/localized-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { FabComponent } from '@shared/ui/fab/fab.component';
import {
  ButtonComponent,
  ButtonLinkComponent,
  EmptyStateComponent,
  FieldGroupComponent,
  FieldRowComponent,
  IconComponent,
  ListItemComponent,
  RowMenuComponent,
  type RowMenuItem,
  type RowMenuSection,
  SheetBarComponent,
  SheetBarTitleDirective,
  SkeletonComponent,
  StatusTextComponent,
} from '@stupa-makers/ui-kit';
import { EditDrawerService } from '../../features/edit/edit-drawer.service';
import { MAINTENANCE_PAGE, cost, daysOverdue, isDone } from './maintenance-page';

/**
 * One maintenance entry as a sheet beside the list (`/maintenance/:id`): its item, the due
 * or done date, the cost and the note, and the history of the item (its other entries).
 * The entry comes from the list page, which holds every entry. "Als erledigt markieren" is
 * the floating action while the entry is open; the pencil opens the side pane editor.
 */
@Component({
  selector: 'app-maintenance-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslatePipe,
    LocalizedDatePipe,
    MoneyPipe,
    FabComponent,
    ButtonComponent,
    ButtonLinkComponent,
    EmptyStateComponent,
    FieldGroupComponent,
    FieldRowComponent,
    IconComponent,
    ListItemComponent,
    RowMenuComponent,
    SheetBarComponent,
    SheetBarTitleDirective,
    SkeletonComponent,
    StatusTextComponent,
  ],
  template: `
    <div class="detail">
      @if (page.loading() && !entry()) {
        <app-skeleton variant="panel" [label]="'common.loading' | t" />
      } @else if (entry(); as e) {
        <article class="sheet md" animate.enter="motion-fade-in" aria-labelledby="md-title">
          <header class="sheet-head">
            <app-sheet-bar [bleed]="page.split()">
              <h2 appSheetBarTitle id="md-title" class="sheet-title">{{ e.name }}</h2>
              <app-button
                variant="text"
                [iconOnly]="true"
                [ariaLabel]="'common.edit' | t"
                (click)="editor.openMaintenance(e)"
                ><app-icon name="edit"
              /></app-button>
              <app-row-menu
                [label]="'common.actions' | t"
                [sections]="menu()"
                (selected)="onMenu(e, $event)"
              />
            </app-sheet-bar>
            <p class="sheet-line">
              <a class="sheet-link" [routerLink]="['/items', e.itemID]">{{ e.itemName }}</a>
              <span class="sheet-dot" aria-hidden="true">·</span>
              @if (done()) {
                <span>{{ 'maint.doneOn' | t: { date: (e.completedDate | ldate) } }}</span>
              } @else if (hasDue()) {
                <span>{{ 'maint.dueOn' | t: { date: (e.scheduledDate | ldate) } }}</span>
              } @else {
                <span>{{ 'maint.group.undated' | t }}</span>
              }
              @if (late() > 0) {
                <span class="sheet-dot" aria-hidden="true">·</span>
                <app-status-text kind="warn">{{
                  (late() === 1 ? 'maint.lateOne' : 'maint.late') | t: { days: late() }
                }}</app-status-text>
              }
            </p>
          </header>

          <div class="sheet-cols">
            <div class="sheet-col">
              <section class="sheet-sec" aria-labelledby="md-facts">
                <h3 class="sec" id="md-facts">{{ 'item.details' | t }}</h3>
                <app-field-group>
                  <div class="sheet-pair">
                    <app-field-row
                      [label]="'maint.scheduledDate' | t"
                      [value]="(e.scheduledDate | ldate) || '–'"
                    />
                    <app-field-row
                      [label]="'maint.completedDate' | t"
                      [value]="(e.completedDate | ldate) || '–'"
                    />
                  </div>
                  <app-field-row
                    [label]="'maint.cost' | t"
                    [value]="cost(e) ? (cost(e) | money) : '–'"
                    [mono]="true"
                  />
                </app-field-group>
              </section>
              @if (e.description) {
                <section class="sheet-sec" aria-labelledby="md-note">
                  <h3 class="sec" id="md-note">{{ 'maint.note' | t }}</h3>
                  <p class="md__note">{{ e.description }}</p>
                </section>
              }
            </div>
            <div class="sheet-col">
              <section class="sheet-sec" aria-labelledby="md-hist">
                <h3 class="sec" id="md-hist">
                  {{ 'maint.history' | t }} <span class="muted num">{{ history().length }}</span>
                </h3>
                @if (history().length === 0) {
                  <app-empty-state rows="2" [heading]="'maint.historyEmpty' | t" />
                } @else {
                  <div class="rowgroup">
                    @for (h of history(); track h.id) {
                      <app-list-item
                        [title]="h.name"
                        [sub]="(h.completedDate | ldate) || (h.scheduledDate | ldate)"
                        [link]="['/maintenance', h.id]"
                        linkQueryParamsHandling="preserve"
                      >
                        <span lead class="md__icon" [class.md__icon--done]="isDone(h)"
                          ><app-icon [name]="isDone(h) ? 'circleok' : 'clock'" [size]="20"
                        /></span>
                        @if (cost(h)) {
                          <span trail class="num md__cost">{{ cost(h) | money }}</span>
                        }
                      </app-list-item>
                    }
                  </div>
                }
              </section>
            </div>
          </div>
        </article>
        @if (!done()) {
          <app-fab
            icon="check"
            animate.enter="motion-fade-in"
            [label]="'maint.markDone' | t"
            (activate)="page.markDone(e)"
          />
        }
      } @else {
        <app-empty-state code="404" icon="wrench" [heading]="'maint.notFound' | t">
          <a appButton="tonal" routerLink="/maintenance">{{ 'maint.allEntries' | t }}</a>
        </app-empty-state>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      min-width: 0;
    }
    .detail {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      min-width: 0;
    }
    .md {
      padding-bottom: calc(56px + var(--space-6));
    }
    .md__note {
      margin: 0;
      white-space: pre-wrap;
    }
    .md__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--color-text) 8%, transparent);
      color: var(--color-text-muted);
    }
    .md__icon--done {
      background: var(--color-selected);
      color: var(--color-accent-text);
    }
    .md__cost {
      pointer-events: none;
      color: var(--color-text-muted);
      font-size: var(--fs-small);
    }
  `,
})
export class MaintenanceDetailComponent {
  protected readonly page = inject(MAINTENANCE_PAGE);
  protected readonly editor = inject(EditDrawerService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  readonly entry = computed(() => this.page.entries().find((e) => e.id === this.id()) ?? null);
  readonly done = computed(() => {
    const e = this.entry();
    return !!e && isDone(e);
  });
  readonly hasDue = computed(() => !!apiDate(this.entry()?.scheduledDate));
  readonly late = computed(() => {
    const e = this.entry();
    return e ? daysOverdue(e) : 0;
  });

  /** The other entries of the same item, the newest first. */
  readonly history = computed<MaintenanceEntryWithDetails[]>(() => {
    const e = this.entry();
    if (!e) return [];
    const time = (x: MaintenanceEntryWithDetails) =>
      (apiDate(x.completedDate) ?? apiDate(x.scheduledDate))?.getTime() ?? 0;
    return this.page
      .entries()
      .filter((x) => x.itemID === e.itemID && x.id !== e.id)
      .sort((a, b) => time(b) - time(a));
  });

  readonly menu = computed<RowMenuSection[]>(() => [
    {
      items: [{ id: 'item', label: this.i18n.translate('maint.openItem'), icon: 'package' }],
    },
    {
      items: [
        { id: 'delete', label: this.i18n.translate('common.delete'), icon: 'trash', danger: true },
      ],
    },
  ]);

  readonly isDone = isDone;
  readonly cost = cost;

  onMenu(e: MaintenanceEntryWithDetails, item: RowMenuItem): void {
    if (item.id === 'delete') this.page.askDelete(e);
    if (item.id === 'item') void this.router.navigate(['/items', e.itemID]);
  }
}
