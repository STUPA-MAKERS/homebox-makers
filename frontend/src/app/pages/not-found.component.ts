import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { ButtonLinkComponent, EmptyStateComponent } from '@stupa-makers/ui-kit';

/** 404: a URL that matches no route. */
@Component({
  selector: 'app-not-found',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, EmptyStateComponent, ButtonLinkComponent],
  template: `
    <div class="page">
      <app-empty-state
        code="404"
        icon="search"
        [heading]="'notFound.title' | t"
        [body]="'notFound.body' | t"
      >
        <a appButton="tonal" routerLink="/home">{{ 'notFound.home' | t }}</a>
      </app-empty-state>
    </div>
  `,
})
export class NotFoundComponent {}
