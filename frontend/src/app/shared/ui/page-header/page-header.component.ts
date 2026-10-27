import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { ListDetailNav, dockInListDetailBar } from '@stupa-makers/ui-kit';

/**
 * The header of a page: the title, an optional meta text and status beside it (`heading`
 * slot), a subtitle, and the actions at the end (`actions` slot).
 *
 * - `pane`: the header of a list column (an `h1` with an id for `aria-labelledby`).
 * - `rail`: caps the header to the content width of a centred page.
 * - `flush`: no bottom margin, for a parent that spaces its children.
 *
 * Below the bar of a one-view page (a detail of `app-list-detail` on a phone) the header
 * hands its title and actions to that bar (`dockInListDetailBar`).
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  host: {
    '[class.ph--flush]': 'flush()',
    '[class.ph--rail]': 'rail()',
    '[class.ph--pane]': 'pane()',
    '[class.ph--display]': 'display()',
  },
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly meta = input<string | null>(null);
  readonly flush = input(false);
  readonly rail = input(false);
  readonly pane = input(false);
  readonly display = input(false);
  readonly titleId = input<string | null>(null);
  readonly titleTag = input<'h1' | 'p'>('h1');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly nav = inject(ListDetailNav, { optional: true });
  private readonly actions = viewChild.required<TemplateRef<unknown>>('actions');
  private readonly facts = viewChild.required<TemplateRef<unknown>>('facts');

  protected readonly docked = dockInListDetailBar({
    actions: this.actions,
    titled: () => !this.pane(),
    title: () => this.host.nativeElement.querySelector('.ph__title'),
    subtitle: this.facts,
  });

  constructor() {
    effect(() => {
      const title = this.title();
      if (this.docked()) this.nav?.title.set(title);
    });
  }
}
