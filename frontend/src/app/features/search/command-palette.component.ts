import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, map } from 'rxjs';
import { ApiClient } from '@core/api/api-client.service';
import type { EntitySummary } from '@core/api/models';
import { RefDataService } from '@core/data/ref-data.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import type { TranslationKey } from '@core/i18n/translations';
import {
  EmptyStateComponent,
  HighlightComponent,
  IconComponent,
  type IconName,
  isApplePlatform,
  liveSearch,
  StatusTextComponent,
  TruncatedDirective,
} from '@stupa-makers/ui-kit';
import { NavService } from '../../layout/nav.service';
import { CommandPaletteService } from './command-palette.service';

/** One row of the palette. Pages and tags come from the client, items and places from the server. */
interface PaletteRow {
  key: string;
  group: string;
  title: string;
  subtitle: string | null;
  icon: IconName;
  url: string;
  /** Status text instead of the subtitle (never set here; the shared template knows it). */
  status?: boolean;
  /** An archived item: the row marks it, so it is not read as current. */
  archived?: boolean;
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
 * Global search, as a command palette (the one of STUPA-Workflow).
 *
 * One box answers "take me to the drill" and "take me to the backups": pages and tags
 * match on the client at once, items and places come from `GET /entities` (name,
 * description, serial and model numbers, notes, asset id). The field is a combobox: the
 * focus stays in it, the arrow keys move the active row, Enter opens it and Escape closes
 * the palette. {@link CommandPaletteService} opens it from anywhere; Ctrl+K (⌘K) toggles it.
 */
@Component({
  selector: 'app-command-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    EmptyStateComponent,
    HighlightComponent,
    TruncatedDirective,
    FormsModule,
    TranslatePipe,
    IconComponent,
    StatusTextComponent,
  ],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.scss',
})
export class CommandPaletteComponent {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly nav = inject(NavService);
  private readonly ref = inject(RefDataService);
  private readonly palette = inject(CommandPaletteService);

  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  /** `⎋` is the key's own symbol on Apple keyboards; elsewhere the word is clearer. */
  protected readonly escLabel = isApplePlatform() ? '⎋' : 'Esc';

  readonly open = this.palette.isOpen;
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
    result: (res) => this.showResults(res),
    reset: () => this.showResults(EMPTY),
    error: () => this.showResults(EMPTY),
  });
  readonly loading = this.search.pending;
  /** Index of the highlighted row, over the flattened list. */
  readonly active = signal(0);

  private readonly results = signal<SearchResults>(EMPTY);
  /** Where the focus was before the palette opened; it goes back there on close. */
  private returnFocus: HTMLElement | null = null;

  private readonly pageRows = computed<PaletteRow[]>(() => {
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
        key: `page:${p.path}`,
        group,
        title: p.label,
        subtitle: p.parent,
        icon: p.icon,
        url: p.path,
      }));
  });

  private readonly tagRows = computed<PaletteRow[]>(() => {
    const q = this.query().trim().toLocaleLowerCase();
    if (q.length < MIN_QUERY) return [];
    const group = this.i18n.translate('search.group.tags');
    return this.ref
      .tags()
      .filter((t) => t.name.toLocaleLowerCase().includes(q))
      .slice(0, 5)
      .map((t) => ({
        key: `tag:${t.id}`,
        group,
        title: t.name,
        subtitle: t.description || null,
        icon: 'tag' as const,
        url: `/tags/${t.id}`,
      }));
  });

  private readonly recordRows = computed<PaletteRow[]>(() => {
    const { items, locations } = this.results();
    const itemGroup = this.i18n.translate('search.group.items');
    const locGroup = this.i18n.translate('search.group.locations');
    return [
      ...items.map((e) => ({
        key: `item:${e.id}`,
        group: itemGroup,
        title: e.name,
        subtitle: this.subtitle(e),
        icon: 'package' as const,
        url: `/items/${e.id}`,
        archived: e.archived,
      })),
      ...locations.map((e) => ({
        key: `location:${e.id}`,
        group: locGroup,
        title: e.name,
        subtitle: e.parent?.name ?? null,
        icon: 'mappin' as const,
        url: `/locations/${e.id}`,
      })),
    ];
  });

  /** Pages first: they are instant and exact. Then the inventory, then the tags. */
  readonly rows = computed<PaletteRow[]>(() => [
    ...this.pageRows(),
    ...this.recordRows(),
    ...this.tagRows(),
  ]);

  /** The rows regrouped for rendering, keeping the flat order for the keyboard. */
  readonly groups = computed<{ label: string; rows: PaletteRow[] }[]>(() => {
    const out: { label: string; rows: PaletteRow[] }[] = [];
    for (const row of this.rows()) {
      const last = out[out.length - 1];
      if (last && last.label === row.group) last.rows.push(row);
      else out.push({ label: row.group, rows: [row] });
    }
    return out;
  });

  readonly activeId = computed(() => {
    const row = this.rows()[this.active()];
    return row ? this.optionId(row) : null;
  });

  readonly showEmpty = computed(
    () => !this.loading() && this.query().trim().length >= MIN_QUERY && !this.rows().length,
  );
  readonly showTruncated = computed(() => this.results().truncated && this.rows().length > 0);

  constructor() {
    this.palette.opened$.pipe(takeUntilDestroyed()).subscribe(() => this.reset());

    effect(() => {
      if (this.open()) queueMicrotask(() => this.field()?.nativeElement.focus());
    });
  }

  show(): void {
    this.ref.ensureLoaded().subscribe();
    this.palette.open();
  }

  close(): void {
    if (!this.open()) return;
    this.palette.close();
    const target = this.returnFocus;
    this.returnFocus = null;
    if (target?.isConnected) target.focus();
  }

  onQuery(value: string): void {
    this.query.set(value);
    this.active.set(0);
    this.search.set(value);
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKey(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (this.open()) this.close();
      else this.show();
      return;
    }
    if (!this.open()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key === 'Tab') {
      this.trapTab(event);
      return;
    }
    if (event.target !== this.field()?.nativeElement) return;
    const rows = this.rows();
    if (!rows.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveTo(rows, (this.active() + 1) % rows.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveTo(rows, (this.active() - 1 + rows.length) % rows.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.go(rows[Math.min(this.active(), rows.length - 1)]);
    }
  }

  go(row: PaletteRow): void {
    this.returnFocus = null;
    this.close();
    void this.router.navigateByUrl(row.url);
  }

  indexOf(row: PaletteRow): number {
    return this.rows().findIndex((r) => r.key === row.key);
  }

  optionId(row: PaletteRow): string {
    return `palette-option-${row.key.replace(/[^A-Za-z0-9_-]/g, '-')}`;
  }

  /** The place and the asset id of an item, as its second line. */
  private subtitle(e: EntitySummary): string | null {
    const parts = [e.parent?.name, e.assetId ? `#${e.assetId}` : null].filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
  }

  private reset(): void {
    this.returnFocus = document.activeElement as HTMLElement | null;
    this.query.set('');
    this.search.sync('');
    this.showResults(EMPTY);
    this.ref.ensureLoaded().subscribe();
  }

  private showResults(res: SearchResults): void {
    this.results.set(res);
    this.active.set(0);
  }

  /** Keep the focus in the dialog: Tab goes round between the field and the close button. */
  private trapTab(event: KeyboardEvent): void {
    const first = this.field()?.nativeElement;
    const last = this.closeButton()?.nativeElement;
    if (!first || !last) return;
    const current = document.activeElement;
    let next: HTMLElement | null = null;
    if (current !== first && current !== last) next = first;
    else if (event.shiftKey && current === first) next = last;
    else if (!event.shiftKey && current === last) next = first;
    if (next) {
      event.preventDefault();
      next.focus();
    }
  }

  private moveTo(rows: PaletteRow[], index: number): void {
    this.active.set(index);
    const id = this.optionId(rows[index]);
    queueMicrotask(() => document.getElementById(id)?.scrollIntoView({ block: 'nearest' }));
  }
}
