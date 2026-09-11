import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  heart,
  heartOutline,
} from 'ionicons/icons';

import { SpaceSummary } from '../models/space-summary.model';

@Component({
  selector: 'app-space-list-item',
  templateUrl: './space-list-item.component.html',
  styleUrls: ['./space-list-item.component.scss'],
  imports: [
    IonIcon,
  ],
})
export class SpaceListItemComponent {
  @Input({ required: true })
  space!: SpaceSummary;

  @Input()
  availability = '';

  get availabilityLabel(): string {
    if (this.availability) return this.availability;
    if (this.space.status === 'maintenance') return 'Spazio in manutenzione';
    if (this.space.status === 'deactivated') return 'Spazio disattivato';
    return 'Disponibilità da verificare';
  }

  get unavailable(): boolean {
    return this.space.status === 'maintenance' || this.space.status === 'deactivated';
  }

  @Input()
  favorite = false;

  @Output()
  spaceOpened = new EventEmitter<string>();

  @Output()
  favoriteToggled = new EventEmitter<string>();

  constructor() {
    addIcons({
      heart,
      heartOutline,
    });
  }

  openSpace(): void {
    this.spaceOpened.emit(this.space.id);
  }

  toggleFavorite(): void {
    this.favoriteToggled.emit(this.space.id);
  }
}
