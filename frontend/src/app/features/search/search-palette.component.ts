import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, map } from 'rxjs';
import { ApiClient } from '@core/api/api-client.service';
import type { EntitySummary } from '@core/api/models';
import { RefDataService } from '@core/data/ref-data.service';
import { I18nService } from '@core/i18n/i18n.service';
import type { TranslationKey } from '@core/i18n/translations';
import { type IconName, liveSearch } from '@stupa-makers/ui-kit';
import {
  CommandPalette,
  CommandPaletteComponent,
  type PaletteGroup,
  type PaletteRow,
} from '@stupa-makers/ui-kit/shell';
import { NavService } from '../../layout/nav.service';

/** One row of the palette with the group it belongs to. */
interface GroupedRow extends PaletteRow {
  readonly group: string;
}

interface SearchResults {
  items: EntitySummary[];
  locations: EntitySummary[];
  truncated: boolean;
}

/** How long to wait after a keystroke before asking the server. */
const DEBOUNCE_MS = 180;

/** Shorter queries ask nothing of the server. */
const MIN_QUERY = 2;

const ITEM_LIMIT = 8;
const LOCATION_LIMIT = 5;

/** Pages that are not in the navigation, so the search finds "Werkzeuge" or "Profil". */
const EXTRA_PAGES: readonly {
  path: string;
  labelKey: TranslationKey;
  icon: IconName;
  parentKey?: TranslationKey;
}[] = [
  {
    path: '/collection/types',
    labelKey: 'collection.tab.types',
    icon: 'shapes',
    parentKey: 'nav.collection',
  },
  {
    path: '/collection/templates',
    labelKey: 'collection.tab.templates',
    icon: 'template',
    parentKey: 'nav.collection',
  },
  {
    path: '/collection/notifiers',
    labelKey: 'collection.tab.notifiers',
    icon: 'bell',
    parentKey: 'nav.collection',
  },
  {
    path: '/collection/tools',
    labelKey: 'collection.tab.tools',
    icon: 'gear',
    parentKey: 'nav.collection',
  },
  { path: '/profile', labelKey: 'nav.profile', icon: 'user' },
];

const EMPTY: SearchResults = { items: [], locations: [], truncated: false };

/**
 * The sources of the global search, shown in the command palette of the kit.
 *
 * One box answers "take me to the drill" and "take me to the backups": pages and tags
 * match on the client at once, items and places come from `GET /entities` (name,
 * description, serial and model numbers, notes, asset id). The kit palette owns the dialog,
 * the field and the keyboard; {@link CommandPalette} opens it from anywhere, and Ctrl+K (⌘K)
 * toggles it.
 */
@Component({
  selector: 'app-search-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommandPaletteComponent],
  template: `<app-command-palette
    [groups]="groups()"
    [query]="query()"
    [loading]="loading()"
    [truncated]="results().truncated"
    [minQuery]="minQuery"
    (queryChange)="onQuery($event)"
  />`,
})
export class SearchPaletteComponent {
  private readonly api = inject(ApiClient);
  private readonly i18n = inject(I18nService);
  private readonly nav = inject(NavService);
  private readonly ref = inject(RefDataService);

  protected readonly minQuery = MIN_QUERY;
  readonly query = signal('');
  private readonly search = liveSearch<SearchResults>({
    minLength: MIN_QUERY,
    debounceMs: DEBOUNCE_MS,
    run: (q) =>
      forkJoin({
        items: this.api.entities({ q, pageSize: ITEM_LIMIT }),
        locations: this.api.entities({ q, isLocation: true, pageSize: LOCATION_LIMIT }),
      }).pipe(
        map(({ items, locations }) => ({
          items: items.items ?? [],
          locations: locations.items ?? [],
          truncated: items.total > ITEM_LIMIT || locations.total > LOCATION_LIMIT,
        })),
      ),
    result: (res) => this.results.set(res),
    reset: () => this.results.set(EMPTY),
    error: () => this.results.set(EMPTY),
  });
  readonly loading = this.search.pending;

  readonly results = signal<SearchResults>(EMPTY);

  private readonly pageRows = computed<GroupedRow[]>(() => {
    const q = this.query().trim().toLocaleLowerCase();
    if (!q) return [];
    const group = this.i18n.translate('search.group.pages');
    const pages = [
      ...this.nav.items.map((i) => ({
        path: i.path,
        label: this.i18n.translate(i.labelKey),
        icon: i.icon,
        parent: null as string | null,
      })),
      ...EXTRA_PAGES.map((p) => ({
        path: p.path,
        label: this.i18n.translate(p.labelKey),
        icon: p.icon,
        parent: p.parentKey ? this.i18n.translate(p.parentKey) : null,
      })),
    ];
    return pages
      .filter((p) => p.label.toLocaleLowerCase().includes(q))
      .slice(0, 5)
      .map((p) => ({
        id: `page:${p.path}`,
        group,
        title: p.label,
        subtitle: p.parent,
        icon: p.icon,
        link: p.path,
      }));
  });

  private readonly tagRows = computed<GroupedRow[]>(() => {
    const q = this.query().trim().toLocaleLowerCase();
    if (q.length < MIN_QUERY) return [];
    const group = this.i18n.translate('search.group.tags');
    return this.ref
      .tags()
      .filter((t) => t.name.toLocaleLowerCase().includes(q))
      .slice(0, 5)
      .map((t) => ({
        id: `tag:${t.id}`,
        group,
        title: t.name,
        subtitle: t.description || null,
        icon: 'tag' as const,
        link: `/tags/${t.id}`,
      }));
  });

  private readonly recordRows = computed<GroupedRow[]>(() => {
    const { items, locations } = this.results();
    const itemGroup = this.i18n.translate('search.group.items');
    const locGroup = this.i18n.translate('search.group.locations');
    return [
      ...items.map((e) => ({
        id: `item:${e.id}`,
        group: itemGroup,
        title: e.name,
        subtitle: this.subtitle(e),
        icon: 'package' as const,
        link: `/items/${e.id}`,
        archived: e.archived,
      })),
      ...locations.map((e) => ({
        id: `location:${e.id}`,
        group: locGroup,
        title: e.name,
        subtitle: e.parent?.name ?? null,
        icon: 'mappin' as const,
        link: `/locations/${e.id}`,
      })),
    ];
  });

  /**
   * Pages first: they are instant and exact. Then the inventory, then the tags. Rows of one
   * group that follow each other share a heading.
   */
  readonly groups = computed<PaletteGroup[]>(() => {
    const out: { label: string; rows: PaletteRow[] }[] = [];
    for (const row of [...this.pageRows(), ...this.recordRows(), ...this.tagRows()]) {
      const last = out[out.length - 1];
      if (last && last.label === row.group) last.rows.push(row);
      else out.push({ label: row.group, rows: [row] });
    }
    return out;
  });

  constructor() {
    // Each opening starts empty, and the tags of the client-side match load.
    inject(CommandPalette)
      .opened$.pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.query.set('');
        this.search.sync('');
        this.results.set(EMPTY);
        this.ref.ensureLoaded().subscribe();
      });
  }

  onQuery(value: string): void {
    if (value === this.query()) return;
    this.query.set(value);
    this.search.set(value);
  }

  /** The place and the asset id of an item, as its second line. */
  private subtitle(e: EntitySummary): string | null {
    const parts = [e.parent?.name, e.assetId ? `#${e.assetId}` : null].filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
  }
}
