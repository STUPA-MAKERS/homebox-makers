import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, Subject, map, tap } from 'rxjs';
import { API_BASE_URL } from './api.config';
import type {
  APIKeyCreate,
  APIKeyCreatedOut,
  APIKeyOut,
  APISummary,
  ActionAmountResult,
  AttachmentKind,
  BarcodeProduct,
  CurrenciesCurrency,
  EntityCreate,
  EntityListResult,
  EntityOut,
  EntityPatch,
  EntityPath,
  EntityQuery,
  EntitySummary,
  EntityTemplateCreate,
  EntityTemplateCreateItemRequest,
  EntityTemplateOut,
  EntityTemplateSummary,
  EntityTemplateUpdate,
  EntityTypeCreate,
  EntityTypeSummary,
  EntityTypeUpdate,
  EntityUpdate,
  ExportOut,
  Group,
  GroupInvitation,
  GroupInvitationCreate,
  GroupInvitationCreated,
  GroupStatistics,
  GroupUpdate,
  ItemAttachmentUpdate,
  MaintenanceEntry,
  MaintenanceEntryCreate,
  MaintenanceEntryUpdate,
  MaintenanceEntryWithDetails,
  NotifierCreate,
  NotifierOut,
  NotifierUpdate,
  Result,
  TagCreate,
  TagUpdate,
  TagOut,
  TokenResponse,
  TotalsByOrganizer,
  TreeItem,
  UserOut,
  UserRegistration,
  UserSummary,
  ValueOverTime,
  WipeInventoryOptions,
} from './models';

type QueryValue = string | number | boolean | readonly (string | number)[] | null | undefined;

/** Builds `HttpParams` and drops empty values, so an unset filter sends nothing. */
function toParams(query: object): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query) as [string, QueryValue][]) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const v of value) params = params.append(key, String(v));
    } else {
      params = params.set(key, String(value));
    }
  }
  return params;
}

/** `YYYY-MM-DD` in local time, the date format of the statistics routes. */
function isoDay(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Filter of `GET /maintenance` and `GET /entities/{id}/maintenance`. */
export type MaintenanceStatus = 'scheduled' | 'completed' | 'both';

/**
 * The server leaves out empty lists of an entity (`children` is `omitempty`, a nil slice is
 * `null`); the pages can rely on arrays.
 */
function normalizeEntity(e: EntityOut): EntityOut {
  return {
    ...e,
    tags: e.tags ?? [],
    fields: e.fields ?? [],
    attachments: e.attachments ?? [],
    children: e.children ?? [],
  };
}

/**
 * Typed facade over the Homebox REST API (`/api/v1`). One method per backend route, each
 * returns a cold `Observable`. The tenant header (`X-Tenant`) and the 401 handling come from
 * the interceptors, so the methods stay free of session state.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  private readonly changes = new Subject<'entity' | 'tag'>();
  /**
   * Fires after a write to an entity or a tag succeeded, so a list beside an open detail
   * (`app-list-detail`) loads again without a link between the two panes.
   */
  readonly changed$ = this.changes.asObservable();

  private readonly entityWritten = () => this.changes.next('entity');
  private readonly tagWritten = () => this.changes.next('tag');

  private url(path: string): string {
    return `${this.base}${path}`;
  }

  /**
   * A URL the browser opens itself (`<img src>`, download links). Such a request sends the
   * session cookie but no header, so the tenant goes into the query.
   */
  private browserUrl(path: string, tenant: string | null, query: Record<string, string> = {}) {
    const params = new URLSearchParams(query);
    if (tenant) params.set('tenant', tenant);
    const qs = params.toString();
    return this.url(path) + (qs ? `?${qs}` : '');
  }

  // --- public -------------------------------------------------------------------------

  status(): Observable<APISummary> {
    return this.http.get<APISummary>(this.url('/status'));
  }

  login(username: string, password: string, stayLoggedIn: boolean): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(this.url('/users/login'), {
      username,
      password,
      stayLoggedIn,
    });
  }

  register(body: UserRegistration): Observable<void> {
    return this.http.post<void>(this.url('/users/register'), body);
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(this.url('/users/forgot-password'), { email });
  }

  resetPassword(token: string, password: string): Observable<void> {
    return this.http.post<void>(this.url('/users/reset-password'), { token, password });
  }

  /** The OIDC login is a full page redirect, not an XHR. */
  oidcLoginUrl(): string {
    return this.url('/users/login/oidc');
  }

  // --- user ---------------------------------------------------------------------------

  self(): Observable<UserOut> {
    return this.http.get<Result<UserOut>>(this.url('/users/self')).pipe(map((r) => r.item));
  }

  updateSelf(body: { name: string; email: string }): Observable<UserOut> {
    return this.http.put<Result<UserOut>>(this.url('/users/self'), body).pipe(map((r) => r.item));
  }

  deleteSelf(): Observable<void> {
    return this.http.delete<void>(this.url('/users/self'));
  }

  logout(): Observable<void> {
    return this.http.post<void>(this.url('/users/logout'), {});
  }

  changePassword(current: string, next: string): Observable<void> {
    return this.http.put<void>(this.url('/users/self/change-password'), { current, new: next });
  }

  listApiKeys(): Observable<APIKeyOut[]> {
    return this.http.get<APIKeyOut[]>(this.url('/users/self/api-keys'));
  }

  createApiKey(body: APIKeyCreate): Observable<APIKeyCreatedOut> {
    return this.http.post<APIKeyCreatedOut>(this.url('/users/self/api-keys'), body);
  }

  deleteApiKey(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`/users/self/api-keys/${id}`));
  }

  // --- collections (groups) ------------------------------------------------------------

  groups(): Observable<Group[]> {
    return this.http.get<Group[]>(this.url('/groups/all'));
  }

  group(): Observable<Group> {
    return this.http.get<Group>(this.url('/groups'));
  }

  createGroup(name: string): Observable<Group> {
    return this.http.post<Group>(this.url('/groups'), { name });
  }

  updateGroup(body: GroupUpdate): Observable<Group> {
    return this.http.put<Group>(this.url('/groups'), body);
  }

  deleteGroup(): Observable<void> {
    return this.http.delete<void>(this.url('/groups'));
  }

  members(): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>(this.url('/groups/members'));
  }

  removeMember(userId: string): Observable<void> {
    return this.http.delete<void>(this.url(`/groups/members/${userId}`));
  }

  invitations(): Observable<GroupInvitation[]> {
    return this.http.get<GroupInvitation[]>(this.url('/groups/invitations'));
  }

  createInvitation(body: GroupInvitationCreate): Observable<GroupInvitationCreated> {
    return this.http.post<GroupInvitationCreated>(this.url('/groups/invitations'), body);
  }

  deleteInvitation(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`/groups/invitations/${id}`));
  }

  acceptInvitation(id: string): Observable<{ id: string; name: string }> {
    return this.http.post<{ id: string; name: string }>(
      this.url(`/groups/invitations/${id}`),
      null,
    );
  }

  currencies(): Observable<CurrenciesCurrency[]> {
    return this.http.get<CurrenciesCurrency[]>(this.url('/currencies'));
  }

  // --- statistics -----------------------------------------------------------------------

  statistics(): Observable<GroupStatistics> {
    return this.http.get<GroupStatistics>(this.url('/groups/statistics'));
  }

  statisticsByLocation(): Observable<TotalsByOrganizer[]> {
    return this.http.get<TotalsByOrganizer[]>(this.url('/groups/statistics/locations'));
  }

  statisticsByTag(): Observable<TotalsByOrganizer[]> {
    return this.http.get<TotalsByOrganizer[]>(this.url('/groups/statistics/tags'));
  }

  purchasePriceOverTime(start: Date, end: Date): Observable<ValueOverTime> {
    return this.http.get<ValueOverTime>(this.url('/groups/statistics/purchase-price'), {
      params: toParams({ start: isoDay(start), end: isoDay(end) }),
    });
  }

  // --- entities (items and locations) ----------------------------------------------------

  entities(query: EntityQuery = {}): Observable<EntityListResult> {
    return this.http.get<EntityListResult>(this.url('/entities'), { params: toParams(query) });
  }

  /** All locations as a flat list (`isLocation=true`, unpaged). */
  locations(filterChildren = false): Observable<EntitySummary[]> {
    return this.entities({ isLocation: true, filterChildren }).pipe(map((r) => r.items ?? []));
  }

  tree(withItems = false): Observable<TreeItem[]> {
    return this.http.get<TreeItem[]>(this.url('/entities/tree'), {
      params: toParams({ withItems }),
    });
  }

  entity(id: string): Observable<EntityOut> {
    return this.http.get<EntityOut>(this.url(`/entities/${id}`)).pipe(map(normalizeEntity));
  }

  entityPath(id: string): Observable<EntityPath[]> {
    return this.http.get<EntityPath[]>(this.url(`/entities/${id}/path`));
  }

  createEntity(body: EntityCreate): Observable<EntityOut> {
    return this.http
      .post<EntityOut>(this.url('/entities'), body)
      .pipe(map(normalizeEntity), tap(this.entityWritten));
  }

  updateEntity(id: string, body: EntityUpdate): Observable<EntityOut> {
    return this.http
      .put<EntityOut>(this.url(`/entities/${id}`), body)
      .pipe(map(normalizeEntity), tap(this.entityWritten));
  }

  patchEntity(id: string, body: EntityPatch): Observable<EntityOut> {
    return this.http
      .patch<EntityOut>(this.url(`/entities/${id}`), body)
      .pipe(map(normalizeEntity), tap(this.entityWritten));
  }

  deleteEntity(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`/entities/${id}`)).pipe(tap(this.entityWritten));
  }

  duplicateEntity(
    id: string,
    options: {
      copyMaintenance?: boolean;
      copyAttachments?: boolean;
      copyCustomFields?: boolean;
      copyPrefix?: string;
    } = {},
  ): Observable<EntityOut> {
    return this.http
      .post<EntityOut>(this.url(`/entities/${id}/duplicate`), options)
      .pipe(map(normalizeEntity), tap(this.entityWritten));
  }

  customFieldNames(): Observable<string[]> {
    return this.http.get<string[]>(this.url('/entities/fields'));
  }

  customFieldValues(field: string): Observable<string[]> {
    return this.http.get<string[]>(this.url('/entities/fields/values'), {
      params: toParams({ field }),
    });
  }

  importCsv(file: File): Observable<void> {
    const form = new FormData();
    form.append('csv', file);
    return this.http.post<void>(this.url('/entities/import'), form);
  }

  exportUrl(tenant: string | null): string {
    return this.browserUrl('/entities/export', tenant);
  }

  /** Resolve an asset id (`000-123`) to its entity. */
  assetLookup(assetId: string): Observable<EntityListResult> {
    return this.http.get<EntityListResult>(this.url(`/assets/${assetId}`));
  }

  // --- attachments ----------------------------------------------------------------------

  addAttachment(
    entityId: string,
    file: File,
    name: string,
    type: AttachmentKind | null = null,
    primary?: boolean,
  ): Observable<EntityOut> {
    const form = new FormData();
    form.append('file', file);
    if (type) form.append('type', type);
    form.append('name', name);
    if (primary !== undefined) form.append('primary', String(primary));
    return this.http
      .post<EntityOut>(this.url(`/entities/${entityId}/attachments`), form)
      .pipe(map(normalizeEntity));
  }

  updateAttachment(
    entityId: string,
    attachmentId: string,
    body: ItemAttachmentUpdate,
  ): Observable<EntityOut> {
    return this.http
      .put<EntityOut>(this.url(`/entities/${entityId}/attachments/${attachmentId}`), body)
      .pipe(map(normalizeEntity));
  }

  deleteAttachment(entityId: string, attachmentId: string): Observable<void> {
    return this.http.delete<void>(this.url(`/entities/${entityId}/attachments/${attachmentId}`));
  }

  /**
   * The URL of an attachment file, for `<img src>` and download links. A browser request
   * sends the session cookie but no header, so the tenant goes into the query.
   */
  attachmentUrl(entityId: string, attachmentId: string, tenant: string | null): string {
    return this.browserUrl(`/entities/${entityId}/attachments/${attachmentId}`, tenant);
  }

  // --- maintenance ----------------------------------------------------------------------

  maintenanceLog(
    entityId: string,
    status: MaintenanceStatus = 'both',
  ): Observable<MaintenanceEntryWithDetails[]> {
    return this.http.get<MaintenanceEntryWithDetails[]>(
      this.url(`/entities/${entityId}/maintenance`),
      { params: toParams({ status }) },
    );
  }

  createMaintenance(entityId: string, body: MaintenanceEntryCreate): Observable<MaintenanceEntry> {
    return this.http.post<MaintenanceEntry>(this.url(`/entities/${entityId}/maintenance`), body);
  }

  maintenanceAll(status: MaintenanceStatus = 'both'): Observable<MaintenanceEntryWithDetails[]> {
    return this.http.get<MaintenanceEntryWithDetails[]>(this.url('/maintenance'), {
      params: toParams({ status }),
    });
  }

  updateMaintenance(id: string, body: MaintenanceEntryUpdate): Observable<MaintenanceEntry> {
    return this.http.put<MaintenanceEntry>(this.url(`/maintenance/${id}`), body);
  }

  deleteMaintenance(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`/maintenance/${id}`));
  }

  // --- tags -----------------------------------------------------------------------------

  tags(): Observable<TagOut[]> {
    return this.http.get<TagOut[]>(this.url('/tags'));
  }

  tag(id: string): Observable<TagOut> {
    return this.http.get<TagOut>(this.url(`/tags/${id}`));
  }

  createTag(body: TagCreate): Observable<TagOut> {
    return this.http.post<TagOut>(this.url('/tags'), body).pipe(tap(this.tagWritten));
  }

  updateTag(id: string, body: TagUpdate): Observable<TagOut> {
    return this.http.put<TagOut>(this.url(`/tags/${id}`), body).pipe(tap(this.tagWritten));
  }

  deleteTag(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`/tags/${id}`)).pipe(tap(this.tagWritten));
  }

  // --- entity types ---------------------------------------------------------------------

  entityTypes(): Observable<EntityTypeSummary[]> {
    return this.http.get<EntityTypeSummary[]>(this.url('/entity-types'));
  }

  createEntityType(body: EntityTypeCreate): Observable<EntityTypeSummary> {
    return this.http.post<EntityTypeSummary>(this.url('/entity-types'), body);
  }

  updateEntityType(id: string, body: EntityTypeUpdate): Observable<EntityTypeSummary> {
    return this.http.put<EntityTypeSummary>(this.url(`/entity-types/${id}`), body);
  }

  deleteEntityType(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`/entity-types/${id}`));
  }

  // --- templates ------------------------------------------------------------------------

  templates(): Observable<EntityTemplateSummary[]> {
    return this.http.get<EntityTemplateSummary[]>(this.url('/templates'));
  }

  template(id: string): Observable<EntityTemplateOut> {
    return this.http.get<EntityTemplateOut>(this.url(`/templates/${id}`));
  }

  createTemplate(body: EntityTemplateCreate): Observable<EntityTemplateOut> {
    return this.http.post<EntityTemplateOut>(this.url('/templates'), body);
  }

  updateTemplate(id: string, body: EntityTemplateUpdate): Observable<EntityTemplateOut> {
    return this.http.put<EntityTemplateOut>(this.url(`/templates/${id}`), body);
  }

  deleteTemplate(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`/templates/${id}`));
  }

  /** Create an item from a template: its defaults and custom fields, overridden by `body`. */
  createFromTemplate(id: string, body: EntityTemplateCreateItemRequest): Observable<EntityOut> {
    return this.http
      .post<EntityOut>(this.url(`/templates/${id}/create-item`), body)
      .pipe(map(normalizeEntity), tap(this.entityWritten));
  }

  // --- notifiers ------------------------------------------------------------------------

  notifiers(): Observable<NotifierOut[]> {
    return this.http.get<NotifierOut[]>(this.url('/notifiers'));
  }

  createNotifier(body: NotifierCreate): Observable<NotifierOut> {
    return this.http.post<NotifierOut>(this.url('/notifiers'), body);
  }

  updateNotifier(id: string, body: NotifierUpdate): Observable<NotifierOut> {
    return this.http.put<NotifierOut>(this.url(`/notifiers/${id}`), body);
  }

  deleteNotifier(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`/notifiers/${id}`));
  }

  testNotifier(url: string): Observable<void> {
    return this.http.post<void>(this.url('/notifiers/test'), { url });
  }

  // --- backups (collection exports and imports) -----------------------------------------

  exports(): Observable<ExportOut[]> {
    return this.http
      .get<{ items: ExportOut[] }>(this.url('/group/exports'))
      .pipe(map((r) => r.items ?? []));
  }

  createExport(): Observable<ExportOut> {
    return this.http.post<ExportOut>(this.url('/group/exports'), {});
  }

  deleteExport(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`/group/exports/${id}`));
  }

  exportDownloadUrl(id: string, tenant: string | null): string {
    return this.browserUrl(`/group/exports/${id}/download`, tenant);
  }

  /** Restore a backup zip into the collection; the server works on it in the background. */
  importBackup(file: File): Observable<ExportOut> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ExportOut>(this.url('/group/import'), form);
  }

  billOfMaterialsUrl(tenant: string | null): string {
    return this.browserUrl('/reporting/bill-of-materials', tenant);
  }

  // --- maintenance actions --------------------------------------------------------------

  runAction(
    action:
      | 'ensure-asset-ids'
      | 'ensure-import-refs'
      | 'zero-item-time-fields'
      | 'set-primary-photos'
      | 'create-missing-thumbnails',
  ): Observable<ActionAmountResult> {
    return this.http.post<ActionAmountResult>(this.url(`/actions/${action}`), {});
  }

  wipeInventory(options: WipeInventoryOptions): Observable<ActionAmountResult> {
    return this.http.post<ActionAmountResult>(this.url('/actions/wipe-inventory'), options);
  }

  // --- labels, QR codes and barcodes ----------------------------------------------------

  /** The printable label image of an entity. */
  labelUrl(entityId: string, tenant: string | null): string {
    return this.browserUrl(`/labelmaker/entity/${entityId}`, tenant);
  }

  /** The label image of an asset id (also one that has no item yet). */
  assetLabelUrl(assetId: string, tenant: string | null): string {
    return this.browserUrl(`/labelmaker/asset/${encodeURIComponent(assetId)}`, tenant);
  }

  /** A QR code image of `data`, for `<img src>`. */
  qrCodeUrl(data: string, tenant: string | null): string {
    return this.browserUrl('/qrcode', tenant, { data });
  }

  /** Look a product barcode (EAN/UPC) up in the configured product databases. */
  productsByBarcode(barcode: string): Observable<BarcodeProduct[]> {
    return this.http.get<BarcodeProduct[]>(this.url('/products/search-from-barcode'), {
      params: toParams({ data: barcode }),
    });
  }
}
