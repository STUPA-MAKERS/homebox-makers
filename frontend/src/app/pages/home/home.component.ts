import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { ApiClient } from '@core/api/api-client.service';
import type { EntitySummary, GroupStatistics } from '@core/api/models';
import { AuthService } from '@core/auth/auth.service';
import { CollectionService } from '@core/collection/collection.service';
import { RefDataService } from '@core/data/ref-data.service';
import { LocalizedDatePipe } from '@core/i18n/localized-date.pipe';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { EntityThumbComponent } from '@shared/ui/entity-thumb/entity-thumb.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { TagChipComponent } from '@shared/ui/tag-chip/tag-chip.component';
import {
  ButtonComponent,
  EmptyStateComponent,
  IconComponent,
  type IconName,
  ListItemComponent,
  NoteComponent,
  SkeletonComponent,
} from '@stupa-makers/ui-kit';
import { CreateService } from '../../features/create/create.service';

interface StatTile {
  icon: IconName;
  labelKey: 'home.stat.items' | 'home.stat.locations' | 'home.stat.tags' | 'home.stat.value';
  value: number;
  money?: boolean;
  link?: string;
}

/**
 * The start page of a collection: the totals, the items added last, the top-level locations
 * and the tags. "Neu" opens the create dialog for an item or a location.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    RouterLink,
    TranslatePipe,
    LocalizedDatePipe,
    MoneyPipe,
    PageHeaderComponent,
    EntityThumbComponent,
    TagChipComponent,
    ButtonComponent,
    IconComponent,
    ListItemComponent,
    EmptyStateComponent,
    NoteComponent,
    SkeletonComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly api = inject(ApiClient);
  private readonly createSvc = inject(CreateService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);
  readonly collections = inject(CollectionService);
  readonly ref = inject(RefDataService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly stats = signal<GroupStatistics | null>(null);
  readonly recent = signal<EntitySummary[]>([]);

  readonly topLocations = computed(() => this.ref.locations().filter((l) => !l.parent));

  readonly tiles = computed<StatTile[]>(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      { icon: 'package', labelKey: 'home.stat.items', value: s.totalItems, link: '/items' },
      {
        icon: 'mappin',
        labelKey: 'home.stat.locations',
        value: s.totalLocations,
        link: '/locations',
      },
      { icon: 'tag', labelKey: 'home.stat.tags', value: s.totalTags, link: '/tags' },
      { icon: 'euro', labelKey: 'home.stat.value', value: s.totalItemPrice, money: true },
    ];
  });

  constructor() {
    this.load();
    this.createSvc.created.pipe(takeUntilDestroyed()).subscribe(() => this.load());
  }

  load(): void {
    this.error.set(false);
    forkJoin({
      stats: this.api.statistics(),
      recent: this.api.entities({ pageSize: 8, orderBy: 'createdAt', orderDirection: 'desc' }),
      ref: this.ref.reload(),
    })
      .pipe(
        catchError(() => {
          this.error.set(true);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.loading.set(false);
        if (!res) return;
        this.stats.set(res.stats);
        this.recent.set(res.recent.items ?? []);
      });
  }

  newItem(): void {
    this.createSvc.open({ kind: 'item' });
  }

  newLocation(): void {
    this.createSvc.open({ kind: 'location' });
  }

  locationOf(item: EntitySummary): string {
    return item.parent?.name ?? '';
  }
}
