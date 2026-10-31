import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CollectionService } from '@core/collection/collection.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { RowMenuComponent, type RowMenuItem, type RowMenuSection } from '@stupa-makers/ui-kit';

/**
 * The switch of the collection in the navigation rail (the `[shellRailTools]` slot of the
 * kit shell): an entry in the look of a rail entry, whose pill is a row menu with the
 * collections (the current one checked), then "new" and "join".
 */
@Component({
  selector: 'app-collection-switch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, RowMenuComponent],
  template: `<div class="rail__item rail__coll">
    <app-row-menu
      icon="warehouse"
      align="start"
      [label]="'collection.switch' | t"
      [sections]="menu()"
      (selected)="onSelect($event)"
    />
    <span class="rail__label" aria-hidden="true">{{ 'nav.collections' | t }}</span>
  </div>`,
  styleUrl: './collection-switch.component.scss',
})
export class CollectionSwitchComponent {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly collections = inject(CollectionService);

  /** The collections to switch to (the current one checked), then new and join. */
  readonly menu = computed<RowMenuSection[]>(() => [
    {
      items: this.collections.all().map((g) => ({
        id: `go:${g.id}`,
        label: g.name,
        checked: g.id === this.collections.selectedId(),
      })),
    },
    {
      items: [
        { id: 'new', label: this.i18n.translate('collection.new.title'), icon: 'plus' },
        { id: 'join', label: this.i18n.translate('collection.join.title'), icon: 'link' },
      ],
    },
  ]);

  onSelect(item: RowMenuItem): void {
    if (item.id === 'new' || item.id === 'join') {
      void this.router.navigate(['/collection', 'overview'], { queryParams: { action: item.id } });
      return;
    }
    const id = item.id.slice(3);
    if (id === this.collections.selectedId()) return;
    // Another collection shows other data everywhere, so the app starts over on the start page.
    this.collections.select(id);
    void this.router.navigateByUrl('/home').then(() => window.location.reload());
  }
}
