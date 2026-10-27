import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-locations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="page"></div>',
})
export class LocationsComponent {}
