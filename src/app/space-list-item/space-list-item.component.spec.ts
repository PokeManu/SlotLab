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
});
