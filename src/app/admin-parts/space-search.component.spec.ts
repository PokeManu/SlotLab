import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpaceSearchComponent } from './space-search.component';

describe('Admin SpaceSearchComponent', () => {
  let fixture: ComponentFixture<SpaceSearchComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SpaceSearchComponent);
    fixture.detectChanges();
  });

  it('emits the Ionic searchbar value, including an empty value', () => {
    const values: string[] = [];
    fixture.componentInstance.searchChange.subscribe((value) => values.push(value));
    const searchbar = fixture.nativeElement.querySelector('ion-searchbar');

    searchbar.dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'Aula' } }));
    searchbar.dispatchEvent(new CustomEvent('ionInput', { detail: { value: null } }));

    expect(values).toEqual(['Aula', '']);
  });
});
