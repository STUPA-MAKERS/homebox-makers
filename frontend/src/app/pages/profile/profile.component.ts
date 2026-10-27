import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="page"></div>',
})
export class ProfileComponent {}
