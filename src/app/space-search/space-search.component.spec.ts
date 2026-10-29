import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpaceSearchComponent } from './space-search.component';
describe('SpaceSearchComponent', () => {
  let component: SpaceSearchComponent;
  let fixture: ComponentFixture<SpaceSearchComponent>;
  beforeEach(() => {
    fixture = TestBed.createComponent(SpaceSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits the search text from the Ionic searchbar', () => {
    const values: string[] = [];
    component.searchChange.subscribe((value) => values.push(value));
    const searchbar = fixture.nativeElement.querySelector('ion-searchbar');

    searchbar.dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'Aula' } }));
    searchbar.dispatchEvent(new CustomEvent('ionInput', { detail: { value: null } }));

    expect(values).toEqual(['Aula', '']);
  });
});
