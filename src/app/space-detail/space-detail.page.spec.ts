import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpaceDetailPage } from './space-detail.page';

describe('SpaceDetailPage', () => {
  let component: SpaceDetailPage;
  let fixture: ComponentFixture<SpaceDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SpaceDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
