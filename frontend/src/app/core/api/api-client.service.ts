import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';
import { API_BASE_URL } from './api.config';
import type {
  APIKeyCreate,
  APIKeyCreatedOut,
  APIKeyOut,
  APISummary,
  AttachmentKind,
  CurrenciesCurrency,
  EntityCreate,
  EntityListResult,
  EntityOut,
  EntityPatch,
  EntityPath,
  EntityQuery,
  EntitySummary,
  EntityTypeCreate,
  EntityTypeSummary,
  EntityTypeUpdate,
  EntityUpdate,
  Group,
  GroupInvitation,
  GroupInvitationCreate,
  GroupStatistics,
  GroupUpdate,
  ItemAttachmentUpdate,
  MaintenanceEntry,
  MaintenanceEntryCreate,
  MaintenanceEntryUpdate,
  MaintenanceEntryWithDetails,
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
 * Typed facade over the Homebox REST API (`/api/v1`). One method per backend route, each
 * returns a cold `Observable`. The tenant header (`X-Tenant`) and the 401 handling come from
 * the interceptors, so the methods stay free of session state.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  private url(path: string): string {
    return `${this.base}${path}`;
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

  createInvitation(body: GroupInvitationCreate): Observable<GroupInvitation> {
    return this.http.post<GroupInvitation>(this.url('/groups/invitations'), body);
  }

  deleteInvitation(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`/groups/invitations/${id}`));
  }

  acceptInvitation(id: string): Observable<{ id: string; name: string }> {
    return this.http.post<{ id: string; name: string }>(this.url(`/groups/invitations/${id}`), null);
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
    return this.http.get<EntityOut>(this.url(`/entities/${id}`));
  }

  entityPath(id: string): Observable<EntityPath[]> {
    return this.http.get<EntityPath[]>(this.url(`/entities/${id}/path`));
  }

  createEntity(body: EntityCreate): Observable<EntityOut> {
    return this.http.post<EntityOut>(this.url('/entities'), body);
  }

  updateEntity(id: string, body: EntityUpdate): Observable<EntityOut> {
    return this.http.put<EntityOut>(this.url(`/entities/${id}`), body);
  }

  patchEntity(id: string, body: EntityPatch): Observable<EntityOut> {
    return this.http.patch<EntityOut>(this.url(`/entities/${id}`), body);
  }

  deleteEntity(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`/entities/${id}`));
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
    return this.http.post<EntityOut>(this.url(`/entities/${id}/duplicate`), options);
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

  exportUrl(): string {
    return this.url('/entities/export');
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
    return this.http.post<EntityOut>(this.url(`/entities/${entityId}/attachments`), form);
  }

  updateAttachment(
    entityId: string,
    attachmentId: string,
    body: ItemAttachmentUpdate,
  ): Observable<EntityOut> {
    return this.http.put<EntityOut>(
      this.url(`/entities/${entityId}/attachments/${attachmentId}`),
      body,
    );
  }

  deleteAttachment(entityId: string, attachmentId: string): Observable<void> {
    return this.http.delete<void>(this.url(`/entities/${entityId}/attachments/${attachmentId}`));
  }

  /**
   * The URL of an attachment file, for `<img src>` and download links. A browser request
   * sends the session cookie but no header, so the tenant goes into the query.
   */
  attachmentUrl(entityId: string, attachmentId: string, tenant: string | null): string {
    const query = tenant ? `?tenant=${encodeURIComponent(tenant)}` : '';
    return this.url(`/entities/${entityId}/attachments/${attachmentId}${query}`);
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
    return this.http.post<TagOut>(this.url('/tags'), body);
  }

  updateTag(id: string, body: TagUpdate): Observable<TagOut> {
    return this.http.put<TagOut>(this.url(`/tags/${id}`), body);
  }

  deleteTag(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`/tags/${id}`));
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

  // --- labels ---------------------------------------------------------------------------

  /** The printable label image of an entity. */
  labelUrl(entityId: string): string {
    return this.url(`/labelmaker/entity/${entityId}`);
  }
}
