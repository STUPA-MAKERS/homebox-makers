import type { Routes } from '@angular/router';
import { authGuard, guestGuard } from '@core/auth/auth.guard';
import { ShellComponent } from './layout/shell.component';

/**
 * Routing. Every route sits under `ShellComponent` and loads its page lazily. `authGuard`
 * protects the signed-in area, `guestGuard` sends a signed-in user past the login pages.
 * `data.title` is the i18n key of the document title. The redirects keep the URLs of the
 * former Nuxt frontend working (`/item/:id`, `/location/:id`, `/tag/:id`, `/label/:id`), so
 * printed QR labels and bookmarks still open.
 */
export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'login',
        canActivate: [guestGuard],
        data: { title: 'auth.login.title' },
        loadComponent: () => import('./pages/auth/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'forgot-password',
        canActivate: [guestGuard],
        data: { title: 'auth.forgot.title' },
        loadComponent: () =>
          import('./pages/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
      },
      {
        path: 'reset-password',
        data: { title: 'auth.reset.title' },
        loadComponent: () =>
          import('./pages/auth/reset-password.component').then((m) => m.ResetPasswordComponent),
      },
      {
        path: '',
        canActivate: [authGuard],
        children: [
          {
            path: 'home',
            data: { title: 'nav.home' },
            loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
          },
          {
            path: 'items',
            data: { title: 'nav.items' },
            loadComponent: () =>
              import('./pages/items/items-list.component').then((m) => m.ItemsListComponent),
          },
          {
            path: 'items/:id',
            data: { title: 'nav.items' },
            loadComponent: () =>
              import('./pages/items/item-detail.component').then((m) => m.ItemDetailComponent),
          },
          {
            path: 'items/:id/edit',
            data: { title: 'item.edit.title' },
            loadComponent: () =>
              import('./pages/items/item-edit.component').then((m) => m.ItemEditComponent),
          },
          {
            path: 'locations',
            data: { title: 'nav.locations' },
            loadComponent: () =>
              import('./pages/locations/locations.component').then((m) => m.LocationsComponent),
          },
          {
            path: 'locations/:id',
            data: { title: 'nav.locations' },
            loadComponent: () =>
              import('./pages/locations/location-detail.component').then(
                (m) => m.LocationDetailComponent,
              ),
          },
          {
            path: 'tags',
            data: { title: 'nav.tags' },
            loadComponent: () => import('./pages/tags/tags.component').then((m) => m.TagsComponent),
          },
          {
            path: 'tags/:id',
            data: { title: 'nav.tags' },
            loadComponent: () =>
              import('./pages/tags/tag-detail.component').then((m) => m.TagDetailComponent),
          },
          {
            path: 'profile',
            data: { title: 'nav.profile' },
            loadComponent: () =>
              import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
          },
          {
            path: 'collection',
            data: { title: 'nav.collection' },
            loadComponent: () =>
              import('./pages/collection/collection.component').then((m) => m.CollectionComponent),
          },
          {
            path: 'a/:assetId',
            loadComponent: () =>
              import('./pages/items/asset-redirect.component').then(
                (m) => m.AssetRedirectComponent,
              ),
          },
          // Former Nuxt URLs.
          { path: 'item/:id', redirectTo: 'items/:id' },
          { path: 'item/:id/edit', redirectTo: 'items/:id/edit' },
          { path: 'location/:id', redirectTo: 'locations/:id' },
          { path: 'tag/:id', redirectTo: 'tags/:id' },
          { path: 'label/:id', redirectTo: 'tags/:id' },
          { path: 'assets/:assetId', redirectTo: 'a/:assetId' },
        ],
      },
      {
        path: '**',
        data: { title: 'notFound.title' },
        loadComponent: () =>
          import('./pages/not-found.component').then((m) => m.NotFoundComponent),
      },
    ],
  },
];
