import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-item-edit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="page"></div>',
})
export class ItemEditComponent {}
