import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MobileNavigationComponent } from './mobile-navigation.component';

@Component({ standalone: true, template: '<p>Sezione</p>' })
class NavigationTargetStubComponent {}

describe('MobileNavigationComponent', () => {
  let component: MobileNavigationComponent;
  let fixture: ComponentFixture<MobileNavigationComponent>;
  let router: Router;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileNavigationComponent],
      providers: [
        provideRouter(
          [
            'home',
            'spaces',
            'bookings',
            'favorites',
            'profile',
          ].map((path) => ({ path, component: NavigationTargetStubComponent })),
        ),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(MobileNavigationComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('espone cinque pulsanti Ionic per le sezioni principali dell’utente', () => {
    const buttons = [
      ...fixture.nativeElement.querySelectorAll('ion-button'),
    ] as HTMLElement[];

    expect(buttons).toHaveLength(5);
    expect(buttons.map((button) => button.getAttribute('href'))).toEqual(
      component.navigation.map((item) => item.route),
    );
    expect(fixture.nativeElement.textContent).not.toContain('Panoramica');
  });

  it('evidenzia soltanto la sezione attiva dopo una navigazione Router', async () => {
    await router.navigateByUrl('/spaces');
    fixture.detectChanges();

    const active = fixture.nativeElement.querySelectorAll(
      'ion-button.mobile-navigation__link--active',
    );
    expect(active).toHaveLength(1);
    expect(active[0].getAttribute('href')).toBe('/spaces');
  });
});
