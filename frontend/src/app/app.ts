import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LayoutComponent } from './layout/layout.component';

/**
 * Root component. It holds only the layout, whose kit shell holds the one router outlet.
 *
 * The layout is not a route component, because the kit shell reads the data of the child
 * routes of its `ActivatedRoute` when it is created. Under a route component, the router
 * creates the shell before it activates the child route, so the child has no snapshot yet
 * and the shell fails before the first page renders.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LayoutComponent],
  template: `<app-layout />`,
})
export class App {}
