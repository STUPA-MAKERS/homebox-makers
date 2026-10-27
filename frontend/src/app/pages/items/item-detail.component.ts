import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-item-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="page"></div>',
})
export class ItemDetailComponent {}
