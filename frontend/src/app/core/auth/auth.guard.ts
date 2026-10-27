import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

/** A signed-in area: without a session the guard sends the visitor to the login page. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth
    .ensureLoaded()
    .pipe(
      map((user) =>
        user ? true : router.createUrlTree(['/login'], { queryParams: { redirect: state.url } }),
      ),
    );
};

/** The login and register pages: a signed-in user goes on to the start page. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureLoaded().pipe(map((user) => (user ? router.createUrlTree(['/home']) : true)));
};
