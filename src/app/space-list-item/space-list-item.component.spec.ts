import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpaceSummary } from '../models/space-summary.model';
import { SpaceListItemComponent } from './space-list-item.component';
describe('SpaceListItemComponent', () => {
  let component: SpaceListItemComponent;
  let fixture: ComponentFixture<SpaceListItemComponent>;
  const testSpace: SpaceSummary = {
    id: 'space-test',
    name: 'Aula di prova',
    type: 'Aula studio',
    building: 'Edificio 6',
    floor: 2,
    seats: 24,
  };
  beforeEach(() => {
    fixture = TestBed.createComponent(SpaceListItemComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('space', testSpace);
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('mantiene separate le azioni di apertura e preferiti', () => {
    const opened: string[] = [];
    const favorites: string[] = [];
    component.spaceOpened.subscribe((id) => opened.push(id));
    component.favoriteToggled.subscribe((id) => favorites.push(id));

    const favoriteButton = fixture.nativeElement.querySelector(
      'ion-button.space-list-item__favorite',
    );
    const openButton = fixture.nativeElement.querySelector(
      'ion-button.space-list-item__action',
    );
    expect(favoriteButton).toBeTruthy();
    expect(openButton).toBeTruthy();
    favoriteButton.click();
    expect(favorites).toEqual(['space-test']);
    expect(opened).toEqual([]);
    openButton.click();
    expect(opened).toEqual(['space-test']);
  });
});
