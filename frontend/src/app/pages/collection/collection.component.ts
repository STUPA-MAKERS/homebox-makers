import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-collection',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="page"></div>',
})
export class CollectionComponent {}
