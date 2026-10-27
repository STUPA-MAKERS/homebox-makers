import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { type TabItem, TabsComponent } from '@stupa-makers/ui-kit';

export type CollectionSection = 'overview' | 'types' | 'templates' | 'notifiers' | 'tools';

const PATHS: Record<CollectionSection, string> = {
  overview: '/collection',
  types: '/collection/types',
  templates: '/collection/templates',
  notifiers: '/collection/notifiers',
  tools: '/collection/tools',
};

/** The sections of the collection settings as a tab bar; each tab is its own route. */
@Component({
  selector: 'app-collection-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, TabsComponent],
  template: `
    <app-tabs
      [ariaLabel]="'nav.collection' | t"
      [tabs]="tabs()"
      [active]="active()"
      (activeChange)="go($event)"
    />
  `,
})
export class CollectionTabsComponent {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  readonly active = input.required<CollectionSection>();

  readonly tabs = computed<TabItem[]>(() => [
    { id: 'overview', label: this.i18n.translate('collection.tab.overview') },
    { id: 'types', label: this.i18n.translate('collection.tab.types') },
    { id: 'templates', label: this.i18n.translate('collection.tab.templates') },
    { id: 'notifiers', label: this.i18n.translate('collection.tab.notifiers') },
    { id: 'tools', label: this.i18n.translate('collection.tab.tools') },
  ]);

  go(id: string | null): void {
    if (!id || id === this.active()) return;
    void this.router.navigateByUrl(PATHS[id as CollectionSection]);
  }
}
