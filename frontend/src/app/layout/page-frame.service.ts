import { Injectable, signal } from '@angular/core';

/**
 * A page that fills the viewport (a list beside a detail) sets `fill`, so the shell drops the
 * bottom padding and the page ends at the bottom edge of the window.
 */
@Injectable({ providedIn: 'root' })
export class PageFrameService {
  readonly fill = signal(false);
}
