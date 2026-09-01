import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  RouterLink,
} from '@angular/router';
import {
  IonContent,
  IonIcon,
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkCircleOutline,
  locationOutline,
} from 'ionicons/icons';

import {
  findSpace,
  Space,
} from '../data/spaces.data';
import { ReportCategory } from '../models/space-report.model';

@Component({
  selector: 'app-report-create',
  templateUrl: './report-create.page.html',
  styleUrls: ['./report-create.page.scss'],
  imports: [
    FormsModule,
    IonContent,
    IonIcon,
    RouterLink,
  ],
})
export class ReportCreatePage {
  space: Space;

  category: ReportCategory | '' = '';

  description = '';

  submitted = false;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
  ) {
    const spaceId =
      this.activatedRoute.snapshot.paramMap.get('spaceId');

    this.space = findSpace(spaceId);

    addIcons({
      arrowBackOutline,
      checkmarkCircleOutline,
      locationOutline,
    });
  }

  submitReport(): void {
    if (
      !this.category ||
      this.description.trim().length < 10
    ) {
      return;
    }

    this.submitted = true;
  }
}