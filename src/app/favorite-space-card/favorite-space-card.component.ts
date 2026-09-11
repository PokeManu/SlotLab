import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  bookOutline,
  desktopOutline,
  heart,
  peopleOutline,
} from 'ionicons/icons';
import { FavoriteSpace } from '../models/favorite-space.model';
@Component({
  selector: 'app-favorite-space-card',
  templateUrl: './favorite-space-card.component.html',
  styleUrls: ['./favorite-space-card.component.scss'],
  imports: [IonIcon],
})
export class FavoriteSpaceCardComponent {
  @Input({ required: true })
  space!: FavoriteSpace;
  @Output()
  spaceOpened = new EventEmitter<string>();
  @Output()
  favoriteRemoved = new EventEmitter<string>();
  constructor() {
    addIcons({
      bookOutline,
      desktopOutline,
      heart,
      peopleOutline,
    });
  }
  get iconName(): string {
    if (this.space.type === 'Aula studio') {
      return 'book-outline';
    }
    if (this.space.type === 'Laboratorio') {
      return 'desktop-outline';
    }
    return 'people-outline';
  }
  openSpace(): void {
    this.spaceOpened.emit(this.space.id);
  }
  removeFavorite(): void {
    this.favoriteRemoved.emit(this.space.id);
  }
}
