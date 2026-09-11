import { Component, Input, inject } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { moonOutline, sunnyOutline } from 'ionicons/icons';
import { ThemeService } from './theme.service';
@Component({
  selector: 'app-theme-toggle',
  imports: [IonIcon],
  template: `
    <button
      class="theme-toggle"
      [class.theme-toggle--label]="showLabel"
      type="button"
      [attr.aria-label]="actionLabel"
      [attr.title]="actionLabel"
      (click)="theme.toggle()"
    >
      <ion-icon
        [name]="theme.theme() === 'dark' ? 'sunny-outline' : 'moon-outline'"
      ></ion-icon>
      @if (showLabel) {
        <span>{{ actionLabel }}</span>
      }
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      :host:has(.theme-toggle--label) {
        display: block;
        width: 100%;
      }
      .theme-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        padding: 0;
        border: 1px solid var(--slot-border);
        border-radius: 50%;
        background: var(--slot-surface);
        color: var(--slot-text);
        font: inherit;
        cursor: pointer;
      }
      .theme-toggle:hover {
        border-color: var(--slot-primary);
        background: var(--slot-hover);
      }
      .theme-toggle:focus-visible {
        outline: 3px solid var(--slot-primary);
        outline-offset: 3px;
      }
      .theme-toggle ion-icon {
        font-size: 21px;
      }
      .theme-toggle--label {
        justify-content: flex-start;
        gap: 14px;
        width: 100%;
        min-height: 68px;
        padding: 0 24px;
        border: 0;
        border-bottom: 1px solid var(--slot-border);
        border-radius: 0;
        background: transparent;
        color: var(--slot-text);
      }
      .theme-toggle--label ion-icon {
        color: var(--slot-primary-soft);
      }
    `,
  ],
})
export class ThemeToggleComponent {
  @Input()
  showLabel = false;
  readonly theme = inject(ThemeService);
  constructor() {
    addIcons({ moonOutline, sunnyOutline });
  }
  get actionLabel(): string {
    return this.theme.theme() === 'dark'
      ? 'Passa al tema chiaro'
      : 'Passa al tema scuro';
  }
}
