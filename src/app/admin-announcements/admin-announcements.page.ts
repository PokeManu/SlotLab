import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { IonContent } from '@ionic/angular';
import { environment } from '../../environments/environment';
import { AdminSidebarComponent } from '../admin-parts/admin-sidebar.component';

@Component({
  selector: 'app-admin-announcements',
  templateUrl: './admin-announcements.page.html',
  styleUrls: ['./admin-announcements.page.scss'],
  imports: [IonContent, AdminSidebarComponent, FormsModule],
})
export class AdminAnnouncementsPage {
  readonly maxMessageLength = 1000;
  private readonly http = inject(HttpClient);
  title = '';
  message = '';
  readonly sending = signal(false);
  readonly error = signal('');
  readonly result = signal('');

  publish(): void {
    if (this.sending()) return;
    this.error.set('');
    this.result.set('');
    const title = this.title.trim();
    const message = this.message.trim();
    if (!title || !message) {
      this.error.set('Inserisci titolo e messaggio dell’avviso.');
      return;
    }
    if (message.length > this.maxMessageLength) {
      this.error.set(`Il messaggio non può superare ${this.maxMessageLength} caratteri.`);
      return;
    }
    this.sending.set(true);
    this.http.post<{ data: { recipientCount: number } }>(`${environment.apiUrl}/admin/announcements`, { title, message }).subscribe({
      next: response => {
        this.title = '';
        this.message = '';
        this.sending.set(false);
        this.result.set(`Avviso pubblicato. Destinatari: ${response.data.recipientCount}.`);
      },
      error: (error: HttpErrorResponse) => {
        this.sending.set(false);
        this.error.set(typeof error.error?.error?.message === 'string'
          ? error.error.error.message : 'Pubblicazione non confermata. Controlla la connessione prima di riprovare.');
      },
    });
  }
}
