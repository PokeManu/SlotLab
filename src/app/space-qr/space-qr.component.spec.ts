import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SpaceQrComponent } from './space-qr.component';

describe('SpaceQrComponent', () => {
  it('genera un QR dello spazio con collegamento coerente e rifiuta ID non validi', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(SpaceQrComponent);
    fixture.componentRef.setInput('spaceId', 12);
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.querySelector('path').getAttribute('d').length).toBeGreaterThan(100);
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/check-in/12');
    const path = fixture.componentInstance.path;
    fixture.componentRef.setInput('spaceId', 13); fixture.detectChanges();
    expect(fixture.componentInstance.path).not.toBe(path);
    fixture.componentRef.setInput('spaceId', '../profile'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('svg')).toBeNull();
  });
});
