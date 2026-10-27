import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import type { EntityOut } from '@core/api/models';
import { ItemEditComponent } from '../../pages/items/item-edit.component';
import { EditDrawerService } from './edit-drawer.service';

/**
 * The side pane of the editor: a scrim and a sheet from the end edge, as the to-do card
 * of STUPA-Workflow. Escape, the scrim, the close button and a navigation close it.
 */
@Component({
  selector: 'app-edit-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ItemEditComponent],
  template: `
    @if (drawer.id(); as id) {
      <div
        class="ed__scrim"
        aria-hidden="true"
        animate.enter="ed__scrim--entering"
        animate.leave="ed__scrim--leaving"
        (click)="drawer.close()"
      ></div>
      <aside
        #pane
        class="ed"
        animate.enter="ed--entering"
        animate.leave="ed--leaving"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ie-title"
        tabindex="-1"
        (keydown.escape)="onEscape($event)"
      >
        <div class="ed__body">
          <app-item-edit [id]="id" (done)="done($event)" />
        </div>
      </aside>
    }
  `,
  styleUrl: './edit-drawer.component.scss',
})
export class EditDrawerComponent {
  protected readonly drawer = inject(EditDrawerService);
  private readonly pane = viewChild<ElementRef<HTMLElement>>('pane');

  constructor() {
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.drawer.close());
    // The pane takes the focus when it opens, so Escape and the keyboard stay in it.
    effect(() => this.pane()?.nativeElement.focus());
  }

  /** A field that took the Escape (a list closing) keeps the pane open. */
  protected onEscape(event: Event): void {
    if (!event.defaultPrevented) this.drawer.close();
  }

  protected done(saved: EntityOut | null): void {
    if (saved) this.drawer.saved.next(saved);
    this.drawer.close();
  }
}
