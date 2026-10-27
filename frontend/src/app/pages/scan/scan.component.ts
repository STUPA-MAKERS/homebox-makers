import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiClient } from '@core/api/api-client.service';
import type { EntitySummary } from '@core/api/models';
import { RefDataService } from '@core/data/ref-data.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { entityLink, isLocation } from '@shared/entity.util';
import { errorMessage } from '@shared/http-error';
import { EntityThumbComponent } from '@shared/ui/entity-thumb/entity-thumb.component';
import { LocationSelectComponent } from '@shared/ui/location-select/location-select.component';
import {
  ButtonComponent,
  DialogComponent,
  EmptyStateComponent,
  IconComponent,
  ListItemComponent,
  SearchPillComponent,
  ToastService,
} from '@stupa-makers/ui-kit';
import { firstValueFrom } from 'rxjs';
import { CameraScanner, decodeImage } from './camera-scanner';

/** What a scan found. */
type ScanHit =
  | { kind: 'entity'; entity: EntitySummary; code: string }
  | { kind: 'many'; code: string; count: number }
  | { kind: 'none'; code: string };

/** A line of the recent scans, kept in the browser. */
interface RecentScan {
  id: string;
  name: string;
  assetId: string;
  location: boolean;
  path: string;
  at: number;
}

const RECENT_KEY = 'homebox:recentScans';
const RECENT_MAX = 8;
/** The same code again within this time is the same scan, not a new one. */
const REPEAT_MS = 2500;

/**
 * The scanner: the camera picture in a rounded viewfinder, the manual entry of an asset id
 * above it and the last scans beside it. A code resolves to an entity: the URL of a
 * Homebox label (`/item/:id`, `/location/:id`, `/a/:assetId`), an asset id, or else any
 * barcode, searched in the collection. The hit shows as a card over the picture with the
 * next steps. Where the browser gives no camera (plain http), a photo of the code works.
 */
@Component({
  selector: 'app-scan',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonComponent,
    DialogComponent,
    EmptyStateComponent,
    EntityThumbComponent,
    IconComponent,
    ListItemComponent,
    LocationSelectComponent,
    SearchPillComponent,
  ],
  templateUrl: './scan.component.html',
  styleUrl: './scan.component.scss',
})
export class ScanComponent {
  private readonly api = inject(ApiClient);
  private readonly ref = inject(RefDataService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);

  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private readonly photoInput = viewChild.required<ElementRef<HTMLInputElement>>('photo');

  readonly camera = new CameraScanner((code) => void this.resolve(code));
  readonly manual = signal('');
  readonly resolving = signal(false);
  readonly hit = signal<ScanHit | null>(null);
  readonly recent = signal<RecentScan[]>(readRecent());

  readonly moving = signal(false);
  readonly moveTarget = signal('');
  readonly moveBusy = signal(false);

  readonly hitEntity = computed(() => {
    const h = this.hit();
    return h?.kind === 'entity' ? h.entity : null;
  });
  readonly hitLocation = computed(() => {
    const e = this.hitEntity();
    return !!e && isLocation(e);
  });
  readonly hitPath = computed(() => {
    const e = this.hitEntity();
    return e ? this.pathOf(e) : '';
  });

  private last: { code: string; at: number } | null = null;

  constructor() {
    this.ref.ensureLoaded().subscribe({ error: () => undefined });
    afterNextRender(() => void this.camera.start(this.video().nativeElement));

    // A hidden tab lets the camera go; back on the tab it starts again.
    const onVisible = () => {
      if (document.hidden) this.camera.stop();
      else void this.camera.start(this.video().nativeElement);
    };
    document.addEventListener('visibilitychange', onVisible);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('visibilitychange', onVisible);
      this.camera.stop();
    });
  }

  retryCamera(): void {
    void this.camera.start(this.video().nativeElement);
  }

  submitManual(): void {
    const code = this.manual().trim();
    if (code) void this.resolve(code, true);
  }

  pickPhoto(): void {
    this.photoInput().nativeElement.click();
  }

  async onPhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.resolving.set(true);
    const code = await decodeImage(file).catch(() => null);
    this.resolving.set(false);
    if (code) void this.resolve(code, true);
    else this.toast.show(this.i18n.translate('scan.noCodeInPhoto'), 'danger');
  }

  /** Back to the camera for the next code. */
  next(): void {
    this.hit.set(null);
    this.manual.set('');
    this.camera.reading.set(true);
  }

  openMove(): void {
    const e = this.hitEntity();
    if (!e) return;
    this.moveTarget.set(e.parent?.id ?? '');
    this.moving.set(true);
  }

  async saveMove(): Promise<void> {
    const e = this.hitEntity();
    const target = this.moveTarget();
    if (!e || !target) return;
    this.moveBusy.set(true);
    try {
      const out = await firstValueFrom(
        this.api.patchEntity(e.id, { id: e.id, parentId: target }),
      );
      const parent = this.ref.locations().find((l) => l.id === target) ?? out.parent ?? null;
      const moved = { ...e, parent };
      this.hit.set({ kind: 'entity', entity: moved, code: (this.hit() as { code: string }).code });
      this.remember(moved);
      this.moving.set(false);
      this.toast.show(this.i18n.translate('scan.moved', { place: this.pathOf(moved) }), 'success');
    } catch (err) {
      this.toast.show(errorMessage(err, this.i18n.translate('common.error')), 'danger');
    } finally {
      this.moveBusy.set(false);
    }
  }

  addMaintenance(): void {
    const e = this.hitEntity();
    if (e) void this.router.navigate(['/items', e.id], { queryParams: { maintenance: 'new' } });
  }

  link(r: RecentScan): string[] {
    return [r.location ? '/locations' : '/items', r.id];
  }

  when(at: number): string {
    const rtf = new Intl.RelativeTimeFormat(this.i18n.formatLocale(), { numeric: 'auto' });
    const s = Math.round((at - Date.now()) / 1000);
    if (s > -60) return rtf.format(0, 'second');
    if (s > -3600) return rtf.format(Math.round(s / 60), 'minute');
    if (s > -86400) return rtf.format(Math.round(s / 3600), 'hour');
    return rtf.format(Math.round(s / 86400), 'day');
  }

  clearRecent(): void {
    this.recent.set([]);
    writeRecent([]);
  }

  /** Resolves a code to an entity and shows the hit. */
  async resolve(raw: string, typed = false): Promise<void> {
    const code = raw.trim();
    if (!code || this.resolving()) return;
    const now = Date.now();
    if (!typed && this.last?.code === code && now - this.last.at < REPEAT_MS) return;
    this.last = { code, at: now };
    this.camera.reading.set(false);
    this.resolving.set(true);
    navigator.vibrate?.(40);
    try {
      const hit = await this.lookup(code);
      this.hit.set(hit);
      if (hit.kind === 'entity') this.remember(hit.entity);
    } catch {
      this.hit.set({ kind: 'none', code });
    } finally {
      this.resolving.set(false);
    }
  }

  private async lookup(code: string): Promise<ScanHit> {
    const target = parseHomeboxCode(code);
    if (target?.kind === 'entity') {
      const e = await firstValueFrom(this.api.entity(target.id));
      return { kind: 'entity', entity: e as unknown as EntitySummary, code };
    }
    if (target?.kind === 'asset') {
      const res = await firstValueFrom(this.api.assetLookup(target.assetId));
      const items = res.items ?? [];
      if (items.length === 1) return { kind: 'entity', entity: items[0], code };
      if (items.length > 1) return { kind: 'many', code: target.assetId, count: items.length };
      return { kind: 'none', code };
    }
    if (/^https?:\/\//i.test(code) || code.startsWith('/')) return { kind: 'none', code };
    // Any other barcode: the collection searches names, serial and model numbers, fields.
    const res = await firstValueFrom(this.api.entities({ q: code, pageSize: 2 }));
    const items = res.items ?? [];
    if (items.length === 1) return { kind: 'entity', entity: items[0], code };
    if (items.length > 1) return { kind: 'many', code, count: res.total ?? items.length };
    return { kind: 'none', code };
  }

  private pathOf(e: EntitySummary): string {
    if (!e.parent) return '';
    const opt = this.ref.locationOptions().find((l) => l.id === e.parent?.id);
    return opt?.path ?? e.parent.name;
  }

  private remember(e: EntitySummary): void {
    const line: RecentScan = {
      id: e.id,
      name: e.name,
      assetId: e.assetId && e.assetId !== '0' ? e.assetId : '',
      location: isLocation(e),
      path: this.pathOf(e),
      at: Date.now(),
    };
    const list = [line, ...this.recent().filter((r) => r.id !== e.id)].slice(0, RECENT_MAX);
    this.recent.set(list);
    writeRecent(list);
  }

  protected readonly entityLink = entityLink;
}

/** What a scanned text points at, when it is a Homebox code. */
type HomeboxTarget = { kind: 'entity'; id: string } | { kind: 'asset'; assetId: string };

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/**
 * Reads the URL of a Homebox label (`…/item/:id`, `…/location/:id`, `…/a/:assetId`, also
 * the plural routes of this frontend) or a bare asset id (`000-123`, `MK-0004`, `123`).
 */
export function parseHomeboxCode(code: string): HomeboxTarget | null {
  // A label holds a full URL, or only the path when the server knows no public URL.
  if (/^https?:\/\//i.test(code) || code.startsWith('/')) {
    let path: string;
    try {
      path = new URL(code, 'http://x').pathname;
    } catch {
      return null;
    }
    const entity = path.match(new RegExp(`/(?:items?|locations?)/(${UUID})(?:/|$)`, 'i'));
    if (entity) return { kind: 'entity', id: entity[1] };
    const asset = path.match(/\/(?:a|assets)\/([A-Za-z0-9-]+)\/?$/);
    if (asset) return { kind: 'asset', assetId: asset[1] };
    return null;
  }
  if (new RegExp(`^${UUID}$`, 'i').test(code)) return { kind: 'entity', id: code };
  // An asset id as printed (`000-123`, `#MK-0004`) or typed by hand (`123`).
  if (/^#?(?:MK-?)?\d[\d-]{0,8}$/i.test(code)) {
    return { kind: 'asset', assetId: code.replace(/^#/, '') };
  }
  return null;
}

function readRecent(): RecentScan[] {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(list) ? list.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function writeRecent(list: RecentScan[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Without storage the list lasts as long as the page.
  }
}
