/**
 * The DTOs of the API. `data-contracts.ts` is generated from the swagger spec of the backend
 * (`task typescript-types`); this module re-exports it and adds the shapes the generator does
 * not know.
 */
export * from './data-contracts';

/** The envelope of the routes that wrap a single object (`/users/self`, the settings). */
export interface Result<T> {
  item: T;
}

/** Query of `GET /entities`. Arrays repeat the parameter (`tags=a&tags=b`). */
export interface EntityQuery {
  q?: string;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  includeArchived?: boolean;
  parentIds?: string[];
  tags?: string[];
  negateTags?: boolean;
  onlyWithoutPhoto?: boolean;
  onlyWithPhoto?: boolean;
  /** `true` lists locations only, `false` items only; absent means items only. */
  isLocation?: boolean;
  filterChildren?: boolean;
  fields?: string[];
}

/** The kinds of an attachment upload (`type` of the multipart form). */
export type AttachmentKind = 'photo' | 'manual' | 'warranty' | 'attachment' | 'receipt';

/** A server error body: `{ error: "..." }`, sometimes with per-field details. */
export interface ApiErrorBody {
  error?: string;
  fields?: Record<string, string>;
}
