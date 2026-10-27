import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-asset-redirect',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="page"></div>',
})
export class AssetRedirectComponent {}
