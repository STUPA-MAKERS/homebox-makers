import { Injectable, computed, inject, signal } from '@angular/core';
import {
  type Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import { ApiClient } from '@core/api/api-client.service';
import type { UserOut } from '@core/api/models';
import { CollectionService } from '@core/collection/collection.service';

/**
 * The cookie that the server sets beside its HttpOnly token cookie, readable by the page:
 * `true` while a session exists. It saves the `/users/self` round trip for a visitor.
 */
const SESSION_COOKIE = 'hb.auth.session';

function readCookie(name: string): string | null {
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

/**
 * The session of the signed-in user.
 *
 * The server keeps the token in an HttpOnly cookie, so the page never sees it. `user` is
 * the answer of `/users/self`; `ensureLoaded()` reads it once and shares the request, so the
 * app initializer, the guard and the shell wait for the same answer.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);
  private readonly collections = inject(CollectionService);

  private readonly _user = signal<UserOut | null>(null);
  private loading$: Observable<UserOut | null> | null = null;
  private loaded = false;

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isSuperuser = computed(() => this._user()?.isSuperuser ?? false);

  /** Resolve the session once: the user and the collections, or `null` without a session. */
  ensureLoaded(): Observable<UserOut | null> {
    if (this.loaded) return of(this._user());
    if (this.loading$) return this.loading$;
    if (readCookie(SESSION_COOKIE) !== 'true') {
      this.loaded = true;
      return of(null);
    }
    this.loading$ = this.fetchSession().pipe(
      finalize(() => {
        this.loaded = true;
        this.loading$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.loading$;
  }

  login(username: string, password: string, stayLoggedIn: boolean): Observable<UserOut | null> {
    return this.api.login(username, password, stayLoggedIn).pipe(
      switchMap(() => this.fetchSession()),
      tap(() => (this.loaded = true)),
    );
  }

  logout(): Observable<void> {
    return this.api.logout().pipe(
      catchError(() => of(undefined)),
      map(() => undefined),
      tap(() => this.invalidate()),
    );
  }

  /** Forget the session locally, after a logout or a 401 of the server. */
  invalidate(): void {
    this._user.set(null);
    this.collections.clear();
    this.loaded = true;
  }

  /** Put a changed profile (name, e-mail) in place. */
  setUser(user: UserOut): void {
    this._user.set(user);
  }

  private fetchSession(): Observable<UserOut | null> {
    return this.api.self().pipe(
      switchMap((user) => this.collections.load(user).pipe(map(() => user))),
      tap((user) => this._user.set(user)),
      catchError(() => {
        this._user.set(null);
        return of(null);
      }),
    );
  }
}
