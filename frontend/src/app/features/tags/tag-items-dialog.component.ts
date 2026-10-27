import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, of, switchMap } from 'rxjs';
import { ApiClient } from '@core/api/api-client.service';
import type { EntitySummary, TagOut } from '@core/api/models';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { errorMessage } from '@shared/http-error';
import { EntityThumbComponent } from '@shared/ui/entity-thumb/entity-thumb.component';
import {
  ButtonComponent,
  DialogComponent,
  IconComponent,
  SearchPillComponent,
  SkeletonComponent,
  ToastService,
} from '@stupa-makers/ui-kit';

/**
 * Give a tag to items from the tag: search the items and tap a row to add or remove the
 * tag. Each tap saves at once (`PATCH /entities/{id}` with the new tag ids).
 */
@Component({
  selector: 'app-tag-items-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    EntityThumbComponent,
    ButtonComponent,
    DialogComponent,
    IconComponent,
    SearchPillComponent,
    SkeletonComponent,
  ],
  template: `
    <app-dialog
      [open]="open()"
      size="form"
      [title]="'tag.assignItems' | t: { name: tag().name }"
      [closeLabel]="'common.close' | t"
      (closed)="closed.emit()"
    >
      <div class="tid">
        <app-search-pill
          [placeholder]="'items.search' | t"
          [label]="'items.searchLabel' | t"
          [clearable]="true"
          [value]="query()"
          (valueChange)="search($event)"
        />
        @if (loading() && !rows().length) {
          <app-skeleton variant="rows" [count]="5" [lead]="true" [label]="'common.loading' | t" />
        } @else if (!rows().length) {
          <p class="tid__empty">{{ 'items.noMatch' | t }}</p>
        } @else {
          <div class="rowgroup tid__rows" [class.tid__rows--busy]="loading()">
            @for (item of rows(); track item.id) {
              <button
                type="button"
                class="tid__row"
                [attr.aria-pressed]="has(item)"
                [disabled]="saving() === item.id"
                (click)="toggle(item)"
              >
                <app-entity-thumb [entity]="item" [size]="36" />
                <span class="tid__text">
                  <span class="tid__name">{{ item.name }}</span>
                  @if (item.parent) {
                    <span class="tid__sub">{{ item.parent.name }}</span>
                  }
                </span>
                <span class="tid__check" [class.tid__check--on]="has(item)">
                  @if (has(item)) {
                    <app-icon name="check" [size]="16" />
                  }
                </span>
              </button>
            }
          </div>
        }
      </div>
      <div dialog-footer>
        <app-button (click)="closed.emit()">{{ 'common.done' | t }}</app-button>
      </div>
    </app-dialog>
  `,
  styles: `
    .tid {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      min-height: 20rem;
    }
    .tid__empty {
      margin: 0;
      color: var(--color-text-muted);
    }
    .tid__rows {
      transition: opacity var(--motion-fast) var(--ease-standard);
    }
    .tid__rows--busy {
      opacity: 0.6;
      transition-delay: 150ms;
    }
    .tid__row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      padding: var(--space-2) var(--space-4);
      border: 0;
      background: var(--color-surface-2);
      color: var(--color-text);
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .tid__row:hover {
      background: var(--color-surface-3);
    }
    .tid__row:focus-visible {
      outline: 2px solid var(--color-focus-ring);
      outline-offset: -2px;
    }
    .tid__text {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-width: 0;
    }
    .tid__name {
      font-weight: var(--fw-medium);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tid__sub {
      color: var(--color-text-muted);
      font-size: var(--fs-small);
    }
    .tid__check {
      display: inline-flex;
      flex: none;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border: 2px solid var(--color-border-strong, var(--color-border));
      border-radius: 6px;
    }
    .tid__check--on {
      border-color: var(--color-accent);
      background: var(--color-accent);
      color: var(--color-on-accent, #fff);
    }
  `,
})
export class TagItemsDialogComponent {
  private readonly api = inject(ApiClient);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);

  readonly open = input(false);
  readonly tag = input.required<TagOut>();
  readonly closed = output<void>();

  readonly query = signal('');
  readonly rows = signal<EntitySummary[]>([]);
  readonly loading = signal(false);
  readonly saving = signal<string | null>(null);

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(
        debounceTime(250),
        switchMap((q) =>
          this.api.entities({ q: q || undefined, pageSize: 30, orderBy: 'name' }).pipe(
            catchError(() => of(null)),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        this.loading.set(false);
        if (res) this.rows.set((res.items ?? []).filter((e) => !e.entityType?.isLocation));
      });
    effect(() => {
      if (!this.open()) return;
      untracked(() => {
        this.query.set('');
        this.loading.set(true);
        this.search$.next('');
      });
    });
  }

  search(q: string): void {
    this.query.set(q);
    this.loading.set(true);
    this.search$.next(q.trim());
  }

  has(item: EntitySummary): boolean {
    return (item.tags ?? []).some((t) => t.id === this.tag().id);
  }

  toggle(item: EntitySummary): void {
    const tag = this.tag();
    const ids = (item.tags ?? []).map((t) => t.id);
    const next = this.has(item) ? ids.filter((id) => id !== tag.id) : [...ids, tag.id];
    this.saving.set(item.id);
    this.api.patchEntity(item.id, { id: item.id, tagIds: next }).subscribe({
      next: (saved) => {
        this.saving.set(null);
        this.rows.update((all) =>
          all.map((r) => (r.id === item.id ? { ...r, tags: saved.tags } : r)),
        );
      },
      error: (err) => {
        this.saving.set(null);
        this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger');
      },
    });
  }
}
