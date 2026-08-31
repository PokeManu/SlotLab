import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminSpacesPage } from './admin-spaces.page';

describe('AdminSpacesPage', () => {
  let component: AdminSpacesPage;
  let fixture: ComponentFixture<AdminSpacesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminSpacesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
