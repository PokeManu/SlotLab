import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { IonContent } from '@ionic/angular';
import { environment } from '../../environments/environment';
import { AdminSidebarComponent } from '../admin-parts/admin-sidebar.component';
interface Building {
  id: number;
  number: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}
@Component({
  selector: 'app-admin-buildings',
  templateUrl: './admin-buildings.page.html',
  styleUrls: ['./admin-buildings.page.scss'],
  imports: [IonContent, AdminSidebarComponent, FormsModule],
})
export class AdminBuildingsPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  editingId: number | null = null;
  buildings: Building[] = [];
  error = '';
  form = {
    number: 0,
    name: '',
    address: '',
    latitude: 38.1157,
    longitude: 13.3615,
  };
  ngOnInit(): void {
    this.load();
  }
  load(): void {
    this.http
      .get<{
        data: Building[];
      }>(`${environment.apiUrl}/admin/buildings`)
      .subscribe({
        next: (response) => {
          this.buildings = response.data;
          this.error = '';
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.error = 'Impossibile caricare gli edifici.';
          this.changeDetector.markForCheck();
        },
      });
  }
  create(): void {
    const request =
      this.editingId === null
        ? this.http.post(`${environment.apiUrl}/admin/buildings`, this.form)
        : this.http.patch(
            `${environment.apiUrl}/admin/buildings/${this.editingId}`,
            this.form,
          );
    request.subscribe({
      next: () => {
        this.editingId = null;
        this.form = {
          number: 0,
          name: '',
          address: '',
          latitude: 38.1157,
          longitude: 13.3615,
        };
        this.error = '';
        this.changeDetector.markForCheck();
        this.load();
      },
      error: () => {
        this.error = 'Dati edificio non validi o numero già usato.';
        this.changeDetector.markForCheck();
      },
    });
  }
  edit(building: Building): void {
    this.editingId = building.id;
    const { id, ...form } = building;
    this.form = form;
  }
  remove(building: Building): void {
    if (!window.confirm(`Eliminare ${building.name}?`)) return;
    this.http
      .delete(`${environment.apiUrl}/admin/buildings/${building.id}`)
      .subscribe({
        next: () => this.load(),
        error: () => {
          this.error = 'L’edificio non può essere eliminato.';
          this.changeDetector.markForCheck();
        },
      });
  }
}
