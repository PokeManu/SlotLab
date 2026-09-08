import { Component, Input, OnChanges } from '@angular/core';
import { RouterLink } from '@angular/router';
import { create } from 'qrcode';

@Component({
  selector: 'app-space-qr',
  imports: [RouterLink],
  template: `@if (path) {
    <svg role="img" aria-label="QR per il check-in dello spazio" [attr.viewBox]="viewBox" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      <path [attr.d]="path" fill="black"/>
    </svg>
    <p>Scansiona il QR con la fotocamera del telefono e apri il collegamento.</p>
    <a [routerLink]="['/check-in', spaceId]">Apri check-in di questo spazio</a>
  }`,
  styles: [':host { display: block; text-align: center; } svg { display: block; width: 240px; max-width: 100%; height: auto; margin: 16px auto; shape-rendering: crispEdges; } a { color: var(--slot-primary-soft); }'],
})
export class SpaceQrComponent implements OnChanges {
  @Input({ required: true }) spaceId: string | number = '';
  path = '';
  viewBox = '';
  ngOnChanges(): void {
    this.path = '';
    if (!/^[1-9]\d*$/.test(String(this.spaceId))) return;
    const url = new URL(`/check-in/${this.spaceId}`, window.location.origin).href;
    const { modules } = create(url, { errorCorrectionLevel: 'M' });
    this.viewBox = `0 0 ${modules.size + 8} ${modules.size + 8}`;
    const pixels: string[] = [];
    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        if (modules.get(row, col)) pixels.push(`M${col + 4} ${row + 4}h1v1h-1z`);
      }
    }
    this.path = pixels.join('');
  }
}
