import { Component, ViewChild, inject, signal } from '@angular/core';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { IonButton, IonContent, IonInput, IonTextarea } from '@ionic/angular';
import { AdminAnnouncementsApi } from '../api/admin-announcements-api';
@Component({
  selector: 'app-admin-announcements',
  templateUrl: './admin-announcements.page.html',
  styleUrls: ['./admin-announcements.page.scss'],
  imports: [IonButton, IonContent, IonInput, IonTextarea, FormsModule],
})
export class AdminAnnouncementsPage {
  readonly maxMessageLength = 1000;
  private readonly announcementsApi = inject(AdminAnnouncementsApi);
  @ViewChild(NgForm) private form?: NgForm;
  title = '';
  message = '';
  attemptedSubmit = false;
  readonly sending = signal(false);
  readonly error = signal('');
  readonly result = signal('');
  titleInvalid(control: NgModel): boolean {
    return (control.touched || this.attemptedSubmit) &&
      (!this.title.trim() || control.invalid === true);
  }
  messageInvalid(control: NgModel): boolean {
    return (control.touched || this.attemptedSubmit) &&
      (!this.message.trim() || control.invalid === true ||
        this.message.trim().length > this.maxMessageLength);
  }
  publish(): void {
    if (this.sending()) return;
    this.error.set('');
    this.result.set('');
    this.attemptedSubmit = true;
    const title = this.title.trim();
    const message = this.message.trim();
    if (!title || !message || message.length > this.maxMessageLength) return;
    this.sending.set(true);
    this.announcementsApi
      .publish(title, message)
      .subscribe({
        next: (response) => {
          this.title = '';
          this.message = '';
          this.form?.resetForm({ title: '', message: '' });
          this.attemptedSubmit = false;
          this.sending.set(false);
          this.result.set(
            `Avviso pubblicato. Destinatari: ${response.data.recipientCount}.`,
          );
        },
        error: (error: HttpErrorResponse) => {
          this.sending.set(false);
          this.error.set(
            typeof error.error?.error?.message === 'string'
              ? error.error.error.message
              : 'Pubblicazione non confermata. Controlla la connessione prima di riprovare.',
          );
        },
      });
  }
}
