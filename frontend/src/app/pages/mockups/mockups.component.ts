import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { IconComponent, ListItemComponent } from '@stupa-makers/ui-kit';

/** The index of the mockups: one row per variant. */
@Component({
  selector: 'app-mockups',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, IconComponent, ListItemComponent],
  template: `
    <div class="page">
      <app-page-header title="Mockups" subtitle="Entwürfe mit Beispieldaten, nichts davon speichert." />
      <div class="rowgroup">
        @for (m of list; track m.path) {
          <app-list-item [title]="m.title" [sub]="m.sub" [link]="['/mockups', m.path]">
            <span lead class="mk__icon"><app-icon [name]="m.icon" [size]="20" /></span>
          </app-list-item>
        }
      </div>
    </div>
  `,
  styles: `
    .mk__icon {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background: var(--color-selected);
      color: var(--color-accent-text);
    }
  `,
})
export class MockupsComponent {
  readonly list = [
    { path: 'maintenance-a', title: 'Wartung A · Liste und Detail', sub: 'Gruppiert nach Fälligkeit, Eintrag als Blatt daneben', icon: 'wrench' as const },
    { path: 'maintenance-b', title: 'Wartung B · Agenda', sub: 'Eine Liste über die ganze Breite mit Datumsblöcken', icon: 'cal' as const },
  ];
}
