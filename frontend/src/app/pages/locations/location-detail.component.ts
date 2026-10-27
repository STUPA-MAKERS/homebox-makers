import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-location-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="page"></div>',
})
export class LocationDetailComponent {}
