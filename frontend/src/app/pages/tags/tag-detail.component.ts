import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-tag-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="page"></div>',
})
export class TagDetailComponent {}
