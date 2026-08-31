import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminBookingsPage } from './admin-bookings.page';

describe('AdminBookingsPage', () => {
  let component: AdminBookingsPage;
  let fixture: ComponentFixture<AdminBookingsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminBookingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
