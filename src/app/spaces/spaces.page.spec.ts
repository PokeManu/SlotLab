import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SpacesPage } from './spaces.page';

describe('SpacesPage', () => {
  let component: SpacesPage;
  let fixture: ComponentFixture<SpacesPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
      ],
    });

    fixture = TestBed.createComponent(SpacesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
