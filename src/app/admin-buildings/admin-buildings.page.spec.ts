import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminBuildingsPage } from './admin-buildings.page';

describe('AdminBuildingsPage', () => {
  it('aggiorna elenco ed errori dopo HTTP senza clic aggiuntivi', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(AdminBuildingsPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();
    const building = { id: 1, number: 6, name: 'Edificio 6', address: 'Viale delle Scienze', latitude: 38.1059, longitude: 13.3504 };
    http.expectOne('/api/v1/admin/buildings').flush({ data: [building] });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.table strong')?.textContent).toBe(building.name);
    fixture.componentInstance.create();
    http.expectOne('/api/v1/admin/buildings').flush({}, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('Dati edificio');
    fixture.componentInstance.load();
    http.expectOne('/api/v1/admin/buildings').flush({ data: [] });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.empty')?.textContent).toContain('Nessun edificio');
    http.verify();
  });
});
