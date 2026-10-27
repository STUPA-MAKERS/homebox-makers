import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-items-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="page"></div>',
})
export class ItemsListComponent {}
