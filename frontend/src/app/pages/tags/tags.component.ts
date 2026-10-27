import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiClient } from '@core/api/api-client.service';
import type { TagOut } from '@core/api/models';
import { RefDataService } from '@core/data/ref-data.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectListDetailPage } from '@shared/list-detail-page';
import { LIST_PAGE_STATE } from '@shared/ui/detail-none/list-none.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import {
  ButtonComponent,
  EmptyStateComponent,
  IconComponent,
  ListDetailLayoutComponent,
  ListItemComponent,
  NoteComponent,
  ScrollFadeDirective,
  SearchPillComponent,
  SkeletonComponent,
  StickyBarComponent,
} from '@stupa-makers/ui-kit';
import { TagDialogComponent } from '../../features/tags/tag-dialog.component';

interface TagRow {
  tag: TagOut;
  depth: number;
}

/** All tags of the collection, nested under their parent tags, with a search and "Neuer Tag". */
@Component({
  selector: 'app-tags',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    PageHeaderComponent,
    ButtonComponent,
    EmptyStateComponent,
    IconComponent,
    ListItemComponent,
    NoteComponent,
    SearchPillComponent,
    SkeletonComponent,
    StickyBarComponent,
    TagDialogComponent,
    ListDetailLayoutComponent,
    RouterOutlet,
    ScrollFadeDirective,
  ],
  providers: [{ provide: LIST_PAGE_STATE, useExisting: forwardRef(() => TagsComponent) }],
  host: { '[class.pane-page]': 'split()' },
  template: `
    <div class="tg" [class.tg--split]="split()">
      <app-list-detail [detailOpen]="selectedId() !== null" (back)="closeDetail()">
        <section list class="ld-pane tg__pane" aria-labelledby="tg-title">
          <app-page-header [pane]="true" titleId="tg-title" [title]="'nav.tags' | t">
            <ng-container ngProjectAs="[actions]">
              <app-button size="sm" (click)="creating.set(true)">
                <span class="btn-label"><app-icon name="plus" />{{ 'tag.short' | t }}</span>
              </app-button>
            </ng-container>
          </app-page-header>

          @if (ref.tags().length > 8) {
            <app-sticky-bar class="ld-pane__filters">
              <app-search-pill
                [placeholder]="'tags.search' | t"
                [label]="'tags.search' | t"
                [clearable]="true"
                [value]="search()"
                (valueChange)="search.set($event)"
              />
            </app-sticky-bar>
          }

          <div class="tg__scroll" appScrollFade="y">
            @if (error()) {
              <app-note kind="error" icon="alert" retryable (retry)="load()">{{
                'common.loadError' | t
              }}</app-note>
            } @else if (loading()) {
              <app-skeleton
                variant="rows"
                [count]="6"
                [lead]="true"
                [label]="'common.loading' | t"
              />
            } @else if (rows().length === 0) {
              <app-empty-state
                icon="tag"
                [heading]="(search() ? 'tags.noMatch' : 'tags.empty') | t"
                [body]="search() ? '' : ('tags.emptyBody' | t)"
              />
            } @else {
              <div class="tg__rows" [class.rowgroup]="!split()" role="list">
                @for (r of rows(); track r.tag.id) {
                  <app-list-item
                    role="listitem"
                    [title]="r.tag.name"
                    [sub]="r.tag.description || null"
                    [link]="['/tags', r.tag.id]"
                    [selected]="r.tag.id === selectedId()"
                  >
                    <span lead class="tg__lead" [style.margin-left.px]="r.depth * 20">
                      <span class="tg__dot" [style.background]="r.tag.color || null"></span>
                    </span>
                  </app-list-item>
                }
              </div>
            }
          </div>
        </section>
        <div detail class="tg__detail">
          <router-outlet />
        </div>
      </app-list-detail>
    </div>

    <app-tag-dialog
      [open]="creating()"
      (closed)="creating.set(false)"
      (saved)="onCreated($event)"
    />
  `,
  styleUrl: './tags.component.scss',
})
export class TagsComponent {
  private readonly router = inject(Router);
  readonly ref = inject(RefDataService);

  private readonly layout = viewChild(ListDetailLayoutComponent);
  private readonly panes = injectListDetailPage(this.layout);
  readonly selectedId = this.panes.selectedId;
  readonly split = this.panes.split;
  readonly hasRows = computed(() => this.ref.tags().length > 0);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly search = signal('');
  readonly creating = signal(false);

  readonly rows = computed<TagRow[]>(() => {
    const all = this.ref.tags();
    const q = this.search().trim().toLocaleLowerCase();
    const byName = (a: TagOut, b: TagOut) => a.name.localeCompare(b.name);
    if (q) {
      return all
        .filter((t) => `${t.name} ${t.description}`.toLocaleLowerCase().includes(q))
        .sort(byName)
        .map((tag) => ({ tag, depth: 0 }));
    }
    const ids = new Set(all.map((t) => t.id));
    const kids = new Map<string | null, TagOut[]>();
    for (const t of all) {
      const p = t.parentId && ids.has(t.parentId) ? t.parentId : null;
      kids.set(p, [...(kids.get(p) ?? []), t]);
    }
    const out: TagRow[] = [];
    const seen = new Set<string>();
    const walk = (parent: string | null, depth: number) => {
      for (const tag of [...(kids.get(parent) ?? [])].sort(byName)) {
        if (seen.has(tag.id)) continue;
        seen.add(tag.id);
        out.push({ tag, depth });
        walk(tag.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  });

  constructor() {
    this.load();
    inject(ApiClient)
      .changed$.pipe(takeUntilDestroyed())
      .subscribe((kind) => kind === 'tag' && this.load());
  }

  load(): void {
    this.error.set(false);
    this.ref.reload().subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  /** "Zur Liste" (one pane at a time). */
  closeDetail(): void {
    void this.router.navigate(['/tags']);
  }

  onCreated(tag: TagOut): void {
    this.creating.set(false);
    void this.router.navigate(['/tags', tag.id]);
  }
}
