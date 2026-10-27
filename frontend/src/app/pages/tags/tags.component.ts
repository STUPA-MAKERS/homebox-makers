import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-tags',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="page"></div>',
})
export class TagsComponent {}
