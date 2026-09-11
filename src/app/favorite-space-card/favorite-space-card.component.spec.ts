import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FAVORITE_SPACES } from '../data/favorite-spaces.data';
import { FavoriteSpaceCardComponent } from './favorite-space-card.component';
describe('FavoriteSpaceCardComponent', () => {
  let component: FavoriteSpaceCardComponent;
  let fixture: ComponentFixture<FavoriteSpaceCardComponent>;
  beforeEach(() => {
    fixture = TestBed.createComponent(FavoriteSpaceCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('space', FAVORITE_SPACES[0]);
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
