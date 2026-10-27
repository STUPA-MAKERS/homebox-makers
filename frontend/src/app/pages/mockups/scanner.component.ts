import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ButtonComponent,
  IconComponent,
  ListItemComponent,
  SearchPillComponent,
} from '@stupa-makers/ui-kit';

/**
 * Mockup of the scanner: the camera as a big rounded viewfinder with the frame to aim,
 * the torch and the camera switch on it, below it the manual entry of an asset id and the
 * last scans. `found` shows the moment after a scan: the item as a card over the
 * viewfinder with the next steps.
 */
@Component({
  selector: 'app-mock-scanner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ButtonComponent,
    IconComponent,
    ListItemComponent,
    SearchPillComponent,
  ],
  template: `
    <div class="page page--wide sc">
      <h1 class="sr-only">Scannen</h1>
      <div class="sc__grid">
        <section class="sc__cam" aria-label="Kamera">
          <app-search-pill
            placeholder="Inventarnummer eingeben, z. B. 000123"
            label="Inventarnummer"
          />
          <div class="sc__view" [class.sc__view--dim]="found()">
            <div class="sc__frame" aria-hidden="true">
              <span class="sc__c sc__c--tl"></span><span class="sc__c sc__c--tr"></span>
              <span class="sc__c sc__c--bl"></span><span class="sc__c sc__c--br"></span>
              @if (!found()) {
                <span class="sc__line"></span>
              }
            </div>
            <div class="sc__tools">
              <app-button variant="tonal" [iconOnly]="true" ariaLabel="Taschenlampe"
                ><app-icon name="bulb"
              /></app-button>
              <app-button variant="tonal" [iconOnly]="true" ariaLabel="Kamera wechseln"
                ><app-icon name="repeat"
              /></app-button>
            </div>
            @if (!found()) {
              <p class="sc__hint">QR-Code, Barcode oder Etikett in den Rahmen halten</p>
            } @else {
              <div class="sc__hit" role="status">
                <div class="sc__hitHead">
                  <span class="sc__thumb"><app-icon name="package" [size]="26" /></span>
                  <div class="sc__hitText">
                    <span class="sc__hitKicker">Gefunden · #MK-0004</span>
                    <span class="sc__hitName">Ecolink Z-Wave PIR Motion Sensor</span>
                    <span class="sc__hitSub">Wohnung › Erdgeschoss › Flur</span>
                  </div>
                </div>
                <div class="sc__hitActions">
                  <a class="sc__act sc__act--main" routerLink="/items"
                    ><app-icon name="right" [size]="22" /><span>Öffnen</span></a
                  >
                  <button type="button" class="sc__act">
                    <app-icon name="mappin" [size]="22" /><span>Verschieben</span>
                  </button>
                  <button type="button" class="sc__act">
                    <app-icon name="wrench" [size]="22" /><span>Wartung</span>
                  </button>
                  <a class="sc__act" routerLink="/scan"
                    ><app-icon name="scan" [size]="22" /><span>Weiter</span></a
                  >
                </div>
              </div>
            }
          </div>
        </section>

        <section class="sc__recent" aria-labelledby="sc-recent">
          <h2 class="sec" id="sc-recent">Zuletzt gescannt</h2>
          <div class="rowgroup">
            @for (r of recent; track r.name) {
              <app-list-item [title]="r.name" [sub]="r.sub" [link]="['/items']">
                <span lead class="sc__lead"><app-icon [name]="r.icon" [size]="20" /></span>
                <span trail class="sc__when">{{ r.when }}</span>
              </app-list-item>
            }
          </div>
          <p class="muted sc__note">
            Etiketten mit QR-Code druckst du unter Einstellungen › Werkzeuge.
          </p>
        </section>
      </div>
    </div>
  `,
  styleUrl: './scanner.component.scss',
})
export class MockScannerComponent {
  readonly found = input(false);
  readonly recent = [
    { name: 'Ecolink Z-Wave PIR Motion Sensor', sub: 'Flur · #MK-0004', when: 'vor 2 Min.', icon: 'package' as const },
    { name: 'Keller', sub: 'Ort · 14 Gegenstände', when: 'gestern', icon: 'mappin' as const },
    { name: 'Akkuschrauber', sub: 'Werkstatt · #MK-0011', when: 'Mo', icon: 'package' as const },
  ];
}
