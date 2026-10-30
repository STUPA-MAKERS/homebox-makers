import { inject } from '@angular/core';
import { Router, type Routes } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { authGuard, guestGuard } from '@core/auth/auth.guard';
import { LayoutComponent } from './layout/layout.component';

/**
 * Routing. Every route sits under `LayoutComponent` and loads its page lazily. `authGuard`
 * protects the signed-in area, `guestGuard` sends a signed-in user past the login pages.
 * `data.title` is the i18n key of the document title. The redirects keep the URLs of the
 * former Nuxt frontend working (`/item/:id`, `/location/:id`, `/tag/:id`, `/label/:id`), so
 * printed QR labels and bookmarks still open.
 */
export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        // An invitation link (`/?token=…`, also of the former frontend): a signed-in user
        // joins on the collection page, a visitor registers with it.
        redirectTo: ({ queryParams }) => {
          const token = queryParams['token'];
          if (!token) return '/home';
          const router = inject(Router);
          return inject(AuthService).user()
            ? router.createUrlTree(['/collection/overview'], { queryParams: { join: token } })
            : router.createUrlTree(['/login'], { queryParams: { token } });
        },
      },
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
            data: { title: 'nav.home', wide: true },
            loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
          },
          // The editor is a side pane over the detail (`EditDrawerService`).
          { path: 'items/:id/edit', redirectTo: 'items/:id' },
          {
            path: 'items',
            data: { title: 'nav.items', wide: true },
            loadComponent: () =>
              import('./pages/items/items-list.component').then((m) => m.ItemsListComponent),
            children: [
              {
                path: '',
                data: {
                  none: { icon: 'package', heading: 'items.none', emptyHeading: 'home.emptyItems' },
                },
                loadComponent: () =>
                  import('@stupa-makers/ui-kit/shell').then(
                    (m) => m.ListNoneComponent,
                  ),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./pages/items/item-detail.component').then((m) => m.ItemDetailComponent),
              },
            ],
          },
          { path: 'locations/:id/edit', redirectTo: 'locations/:id' },
          {
            path: 'locations',
            data: { title: 'nav.locations', wide: true },
            loadComponent: () =>
              import('./pages/locations/locations.component').then((m) => m.LocationsComponent),
            children: [
              {
                path: '',
                data: {
                  none: {
                    icon: 'mappin',
                    heading: 'locations.none',
                    emptyHeading: 'locations.empty',
                  },
                },
                loadComponent: () =>
                  import('@stupa-makers/ui-kit/shell').then(
                    (m) => m.ListNoneComponent,
                  ),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./pages/locations/location-detail.component').then(
                    (m) => m.LocationDetailComponent,
                  ),
              },
            ],
          },
          {
            path: 'tags',
            data: { title: 'nav.tags', wide: true },
            loadComponent: () => import('./pages/tags/tags.component').then((m) => m.TagsComponent),
            children: [
              {
                path: '',
                data: { none: { icon: 'tag', heading: 'tags.pick', emptyHeading: 'tags.empty' } },
                loadComponent: () =>
                  import('@stupa-makers/ui-kit/shell').then(
                    (m) => m.ListNoneComponent,
                  ),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./pages/tags/tag-detail.component').then((m) => m.TagDetailComponent),
              },
            ],
          },
          {
            path: 'maintenance',
            data: { title: 'nav.maintenance', wide: true },
            loadComponent: () =>
              import('./pages/maintenance/maintenance.component').then(
                (m) => m.MaintenanceComponent,
              ),
            children: [
              {
                path: '',
                data: {
                  none: { icon: 'wrench', heading: 'maint.pick', emptyHeading: 'maint.emptyNone' },
                },
                loadComponent: () =>
                  import('@stupa-makers/ui-kit/shell').then(
                    (m) => m.ListNoneComponent,
                  ),
              },
              {
                path: ':id',
                loadComponent: () =>
                  import('./pages/maintenance/maintenance-detail.component').then(
                    (m) => m.MaintenanceDetailComponent,
                  ),
              },
            ],
          },
          {
            // The scanner: the camera, the manual entry of an asset id and the last scans.
            path: 'scan',
            data: { title: 'nav.scan', wide: true },
            loadComponent: () =>
              import('./pages/scan/scan.component').then((m) => m.ScanComponent),
          },
          {
            path: 'profile',
            data: { title: 'nav.profile' },
            loadComponent: () =>
              import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
          },
          {
            path: 'collection',
            data: { title: 'nav.collection', wide: true },
            loadComponent: () =>
              import('./pages/collection/collection-frame.component').then(
                (m) => m.CollectionFrameComponent,
              ),
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./pages/collection/collection.component').then(
                    (m) => m.CollectionComponent,
                  ),
              },
              {
                path: 'overview',
                loadComponent: () =>
                  import('./pages/collection/collection.component').then(
                    (m) => m.CollectionComponent,
                  ),
              },
              {
                path: 'types',
                data: { title: 'collection.tab.types' },
                loadComponent: () =>
                  import('./pages/collection/entity-types.component').then(
                    (m) => m.EntityTypesComponent,
                  ),
              },
              {
                path: 'templates',
                data: { title: 'collection.tab.templates' },
                loadComponent: () =>
                  import('./pages/collection/templates.component').then(
                    (m) => m.TemplatesComponent,
                  ),
              },
              {
                path: 'templates/:id',
                data: { title: 'collection.tab.templates' },
                loadComponent: () =>
                  import('./pages/collection/template-edit.component').then(
                    (m) => m.TemplateEditComponent,
                  ),
              },
              {
                path: 'notifiers',
                data: { title: 'collection.tab.notifiers' },
                loadComponent: () =>
                  import('./pages/collection/notifiers.component').then(
                    (m) => m.NotifiersComponent,
                  ),
              },
              {
                path: 'tools',
                data: { title: 'collection.tab.tools' },
                loadComponent: () =>
                  import('./pages/collection/tools.component').then((m) => m.ToolsComponent),
              },
            ],
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
        loadComponent: () => import('./pages/not-found.component').then((m) => m.NotFoundComponent),
      },
    ],
  },
];
