import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MobileNavigationComponent } from './mobile-navigation.component';
describe('MobileNavigationComponent', () => {
  let component: MobileNavigationComponent;
  let fixture: ComponentFixture<MobileNavigationComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileNavigationComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(MobileNavigationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('usa un’icona diversa per ogni sezione amministrativa', () => {
    const icons = component.adminNavigation.map((item) => item.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
});
