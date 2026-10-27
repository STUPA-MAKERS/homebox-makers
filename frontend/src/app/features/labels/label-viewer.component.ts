import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { ApiClient } from '@core/api/api-client.service';
import { CollectionService } from '@core/collection/collection.service';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { FileViewerComponent, type FileViewerItem, IconComponent } from '@stupa-makers/ui-kit';

/** The part of an item or a location that the label viewer needs. */
export interface LabelTarget {
  id: string;
  name: string;
}

/**
 * The printable label of an item or a location in the file viewer, like a photo: the
 * label image the backend renders, with a download button in the bar. The download is a
 * PNG named after the entity, ready for the label printer.
 */
@Component({
  selector: 'app-label-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FileViewerComponent, IconComponent, TranslatePipe],
  template: `
    <app-file-viewer
      [items]="items()"
      [open]="open() && !!target()"
      (openChange)="open.set($event)"
    >
      @if (items()[0]; as label) {
        <a
          viewerActions
          class="fv__btn"
          [href]="label.url"
          [attr.download]="fileName()"
          [attr.aria-label]="'label.download' | t"
          [title]="'label.download' | t"
        >
          <app-icon name="download" [size]="20" />
        </a>
      }
    </app-file-viewer>
  `,
})
export class LabelViewerComponent {
  private readonly api = inject(ApiClient);
  private readonly collections = inject(CollectionService);
  private readonly i18n = inject(I18nService);

  /** The item or location whose label is shown. */
  readonly target = input<LabelTarget | null>(null);
  /** Whether the viewer is shown; two-way bindable. */
  readonly open = model(false);

  protected readonly items = computed<FileViewerItem[]>(() => {
    const target = this.target();
    if (!target) return [];
    return [
      {
        name: this.i18n.translate('label.title', { name: target.name }),
        url: this.api.labelUrl(target.id, this.collections.selectedId()),
        kind: 'image',
        mime: 'image/png',
      },
    ];
  });

  /** `etikett-akku-bohrschrauber.png`: the name without characters a file system dislikes. */
  protected readonly fileName = computed(() => {
    const name = this.target()?.name ?? '';
    const slug = name
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${this.i18n.translate('label.filePrefix')}${slug ? '-' + slug : ''}.png`;
  });
}
