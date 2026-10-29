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

  it('keeps the open and remove actions independent', () => {
    const opened: string[] = [];
    const removed: string[] = [];
    component.spaceOpened.subscribe((id) => opened.push(id));
    component.favoriteRemoved.subscribe((id) => removed.push(id));

    fixture.nativeElement.querySelector('.favorite-space-card__action').click();
    expect(opened).toEqual([FAVORITE_SPACES[0].id]);
    expect(removed).toEqual([]);

    fixture.nativeElement.querySelector('.favorite-space-card__favorite').click();
    expect(removed).toEqual([FAVORITE_SPACES[0].id]);
    expect(opened).toEqual([FAVORITE_SPACES[0].id]);
  });
});
