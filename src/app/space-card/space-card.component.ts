import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SpaceSummary } from '../models/space-summary.model';
@Component({
  selector: 'app-space-card',
  templateUrl: './space-card.component.html',
  styleUrls: ['./space-card.component.scss'],
  imports: [],
})
export class SpaceCardComponent {
  @Input({ required: true })
  space!: SpaceSummary;
  @Output()
  spaceOpened = new EventEmitter<string>();
  openSpace(): void {
    this.spaceOpened.emit(this.space.id);
  }
}
