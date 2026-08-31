import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BookingsPage } from './bookings.page';

describe('BookingsPage', () => {
  let component: BookingsPage;
  let fixture: ComponentFixture<BookingsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingsPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should change the selected booking view', () => {
    component.selectView('past');

    expect(component.selectedView).toBe('past');
  });
});
