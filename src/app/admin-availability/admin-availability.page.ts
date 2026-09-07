import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { IonContent } from '@ionic/angular';
import { environment } from '../../environments/environment';
import { AdminSidebarComponent } from '../admin-parts/admin-sidebar.component';
interface Space { id: number; name: string; }
interface Availability { availabilityId: number; validFrom: string; validUntil: string; weekday: number; startTime: string; endTime: string; isRetired: boolean; }
interface Unavailability { id: number; date: string; startTime: string; endTime: string; reason: string; }
@Component({ selector: 'app-admin-availability', templateUrl: './admin-availability.page.html', styleUrls: ['./admin-availability.page.scss'], imports: [IonContent, AdminSidebarComponent, FormsModule] })
export class AdminAvailabilityPage implements OnInit {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly http = inject(HttpClient); spaces: Space[] = []; rows: Availability[] = []; unavailabilities: Unavailability[] = []; spaceId = 0; error = '';
  form = { validFrom: new Date().toISOString().slice(0, 10), validUntil: '2099-12-31', weekday: 1, startTime: '08:00', endTime: '20:00' };
  exception = { date: new Date().toISOString().slice(0, 10), startTime: '08:00', endTime: '20:00', reason: '' };
  ngOnInit(): void { this.http.get<{ data: Space[] }>(`${environment.apiUrl}/admin/spaces`).subscribe({ next: response => { this.spaces = response.data; this.changeDetector.markForCheck(); if (this.spaces[0]) { this.spaceId = this.spaces[0].id; this.load(); } }, error: () => { this.error = 'Impossibile caricare gli spazi.'; this.changeDetector.markForCheck(); } }); }
  load(): void { this.error = ''; this.changeDetector.markForCheck(); if (!this.spaceId) { this.rows = []; this.unavailabilities = []; return; } this.http.get<{ data: Availability[] }>(`${environment.apiUrl}/admin/spaces/${this.spaceId}/availability`).subscribe({ next: response => { this.rows = response.data; this.changeDetector.markForCheck(); }, error: () => { this.error = 'Impossibile caricare le disponibilità.'; this.changeDetector.markForCheck(); } }); this.http.get<{ data: Unavailability[] }>(`${environment.apiUrl}/admin/spaces/${this.spaceId}/unavailability`).subscribe({ next: response => { this.unavailabilities = response.data; this.changeDetector.markForCheck(); }, error: () => { this.error = 'Impossibile caricare le indisponibilità.'; this.changeDetector.markForCheck(); } }); }
  create(): void { this.http.post(`${environment.apiUrl}/admin/spaces/${this.spaceId}/availability`, this.form).subscribe({ next: () => this.load(), error: () => { this.error = 'La fascia non è valida o si sovrappone a una esistente.'; this.changeDetector.markForCheck(); } }); }
  retire(row: Availability): void { this.http.delete(`${environment.apiUrl}/admin/spaces/${this.spaceId}/availability/${row.availabilityId}`).subscribe({ next: () => this.load(), error: () => { this.error = 'Impossibile ritirare la fascia.'; this.changeDetector.markForCheck(); } }); }
  createException(): void { this.http.post(`${environment.apiUrl}/admin/spaces/${this.spaceId}/unavailability`, this.exception).subscribe({ next: () => { this.exception.reason = ''; this.changeDetector.markForCheck(); this.load(); }, error: () => { this.error = 'Indisponibilità non valida.'; this.changeDetector.markForCheck(); } }); }
  removeException(row: Unavailability): void { this.http.delete(`${environment.apiUrl}/admin/spaces/${this.spaceId}/unavailability/${row.id}`).subscribe({ next: () => this.load(), error: () => { this.error = 'Impossibile rimuovere l’indisponibilità.'; this.changeDetector.markForCheck(); } }); }
}
