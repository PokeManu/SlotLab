import {
  Component,
  Input,
} from '@angular/core';

import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  accessibilityOutline,
  buildOutline,
  ellipsisHorizontalOutline,
  sparklesOutline,
} from 'ionicons/icons';

import { SpaceReport } from '../models/space-report.model';

@Component({
  selector: 'app-report-list-item',
  templateUrl: './report-list-item.component.html',
  styleUrls: ['./report-list-item.component.scss'],
  imports: [
    IonIcon,
  ],
})
export class ReportListItemComponent {
  @Input({ required: true })
  report!: SpaceReport;

  constructor() {
    addIcons({
      accessibilityOutline,
      buildOutline,
      ellipsisHorizontalOutline,
      sparklesOutline,
    });
  }

  get categoryLabel(): string {
    switch (this.report.category) {
      case 'equipment':
        return 'Attrezzatura';

      case 'cleaning':
        return 'Pulizia';

      case 'accessibility':
        return 'Accessibilità';

      case 'other':
        return 'Altro';
    }
  }

  get statusLabel(): string {
    switch (this.report.status) {
      case 'submitted':
        return 'Inviata';

      case 'in-progress':
        return 'In gestione';

      case 'resolved':
        return 'Risolta';
    }
  }

  get categoryIcon(): string {
    switch (this.report.category) {
      case 'equipment':
        return 'build-outline';

      case 'cleaning':
        return 'sparkles-outline';

      case 'accessibility':
        return 'accessibility-outline';

      case 'other':
        return 'ellipsis-horizontal-outline';
    }
  }
}