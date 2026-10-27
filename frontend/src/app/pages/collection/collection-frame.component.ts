import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { CollectionService } from '@core/collection/collection.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import type { TranslationKey } from '@core/i18n/translations';
import {
  IconComponent,
  type IconName,
  ListDetailLayoutComponent,
  ListItemComponent,
  SelectFieldComponent,
  type SelectFieldOption,
} from '@stupa-makers/ui-kit';
import { filter } from 'rxjs';
import { PageFrameService } from '../../layout/page-frame.service';

interface Section {
  /** The child path; `''` is the overview. */
  path: string;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  icon: IconName;
}

const SECTIONS: readonly Section[] = [
  {
    path: '',
    titleKey: 'collection.tab.overview',
    bodyKey: 'collection.sec.overview',
    icon: 'users',
  },
  {
    path: 'types',
    titleKey: 'collection.tab.types',
    bodyKey: 'collection.sec.types',
    icon: 'shapes',
  },
  {
    path: 'templates',
    titleKey: 'collection.tab.templates',
    bodyKey: 'collection.sec.templates',
    icon: 'template',
  },
  {
    path: 'notifiers',
    titleKey: 'collection.tab.notifiers',
    bodyKey: 'collection.sec.notifiers',
    icon: 'bell',
  },
  {
    path: 'tools',
    titleKey: 'collection.tab.tools',
    bodyKey: 'collection.sec.tools',
    icon: 'tune',
  },
];

/**
 * The settings of the collection as a navigation column beside the open section, the
 * frame of STUPA-Workflow's administration. Side by side the overview opens at
 * `/collection`; one view at a time `/collection` shows the navigation and every section,
 * the overview too (`/collection/overview`), opens below the bar with the way back.
 */
@Component({
  selector: 'app-collection-frame',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    TranslatePipe,
    SelectFieldComponent,
    IconComponent,
    ListDetailLayoutComponent,
    ListItemComponent,
  ],
  host: { '[class.pane-page]': 'split()' },
  template: `
    <div class="cf" [class.cf--split]="split()">
      <app-list-detail [detailOpen]="active() !== null" (back)="back()">
        <nav list class="ld-pane cf__pane" [attr.aria-label]="'nav.collection' | t">
          <h1 class="sr-only">{{ 'nav.collection' | t }}</h1>
          <div class="cf__switch">
            <app-select
              [label]="'collection.switchLabel' | t"
              [required]="true"
              [clearable]="false"
              [options]="collectionOptions()"
              [value]="collections.selectedId() ?? ''"
              (valueChange)="switchTo($event)"
            />
          </div>
          <div class="cf__scroll">
            <div class="cf__rows" [class.rowgroup]="!split()">
              @for (s of sections; track s.path) {
                <app-list-item
                  [title]="s.titleKey | t"
                  [sub]="split() ? null : (s.bodyKey | t)"
                  [link]="link(s)"
                  [selected]="
                    active() === s.path || (split() && active() === null && s.path === '')
                  "
                >
                  <span lead class="cf__icon"><app-icon [name]="s.icon" [size]="20" /></span>
                </app-list-item>
              }
            </div>
          </div>
        </nav>
        <div detail class="cf__detail">
          <router-outlet />
        </div>
      </app-list-detail>
    </div>
  `,
  styleUrl: './collection-frame.component.scss',
})
export class CollectionFrameComponent {
  private readonly router = inject(Router);
  private readonly frame = inject(PageFrameService);
  readonly collections = inject(CollectionService);

  readonly sections = SECTIONS;

  private readonly layout = viewChild(ListDetailLayoutComponent);
  readonly split = computed(() => this.layout()?.collapsed() === false);

  /** The open section, `null` at `/collection` itself. */
  readonly active = signal<string | null>(null);

  constructor() {
    const read = () => {
      const path = this.router.url.split(/[?#]/)[0].split('/').filter(Boolean);
      const sec = path[1] ?? null;
      this.active.set(sec === 'overview' ? '' : sec);
    };
    read();
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(read);
    effect(() => this.frame.fill.set(this.split()));
    inject(DestroyRef).onDestroy(() => this.frame.fill.set(false));
  }

  readonly collectionOptions = computed<SelectFieldOption[]>(() =>
    this.collections.all().map((g) => ({ value: g.id, label: g.name })),
  );

  /** Another collection shows other data everywhere, so the app starts over on the start page. */
  switchTo(id: string): void {
    if (!id || id === this.collections.selectedId()) return;
    this.collections.select(id);
    void this.router.navigateByUrl('/home').then(() => window.location.reload());
  }

  link(s: Section): string[] {
    if (s.path) return ['/collection', s.path];
    return this.split() ? ['/collection'] : ['/collection', 'overview'];
  }

  back(): void {
    void this.router.navigate(['/collection']);
  }
}
