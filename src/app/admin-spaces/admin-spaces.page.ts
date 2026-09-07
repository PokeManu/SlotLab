import { SpaceSearchComponent } from '../admin-parts/space-search.component';
import { AdminSidebarComponent } from '../admin-parts/admin-sidebar.component';
import { Auth } from '../auth/auth';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';

  import {
    addOutline,
    barChartOutline,
    bookOutline,
    businessOutline,
    calendarOutline,
    checkboxOutline,
    chevronBackOutline,
    chevronDownOutline,
    chevronForwardOutline,
    constructOutline,
    createOutline,
    desktopOutline,
    ellipsisVerticalOutline,
    gridOutline,
    searchOutline
  } from 'ionicons/icons';

  interface AdminSpace{
    id: number;
    name: string;
    icon: string;
    building: string,
    capacity: number,
    status: 'available' | 'in-use' | 'maintenance';
    statusLabel: string;
  }


@Component({
  selector: 'app-admin-spaces',
  templateUrl: './admin-spaces.page.html',
  styleUrls: ['./admin-spaces.page.scss'],
  imports: [SpaceSearchComponent, AdminSidebarComponent, IonContent, IonIcon, FormsModule]
})
export class AdminSpacesPage implements OnInit{
  readonly auth = inject(Auth);
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);

  spaces: AdminSpace[] = [];
  buildings: Array<{ id: number; name: string }> = [];
  showCreate = false;
  editingId: number | null = null;
  createError = '';
  loadError = '';
  form = { buildingId: 0, name: '', floor: 0, type: 'study_room', capacity: 1, accessible: false, status: 'active' };
  private search = '';
  
  constructor() {
       addIcons({
        addOutline,
        barChartOutline,
        bookOutline,
        businessOutline,
        calendarOutline,
        checkboxOutline,
        chevronBackOutline,
        chevronDownOutline,
        chevronForwardOutline,
        constructOutline,
        createOutline,
        desktopOutline,
        ellipsisVerticalOutline,
        gridOutline,
        searchOutline
      });
   }

  ngOnInit(): void {
    this.http.get<{ data: Array<{ id: number; name: string }> }>(`${environment.apiUrl}/admin/buildings`).subscribe({ next: response => { this.buildings = response.data; this.changeDetector.markForCheck(); }, error: () => { this.loadError = 'Impossibile caricare gli edifici.'; this.changeDetector.markForCheck(); } });
    this.route.queryParams.subscribe(params => { this.search = typeof params['search'] === 'string' ? params['search'].trim() : ''; this.loadSpaces(); });
  }

  saveSpace(): void {
    const request = this.editingId === null ? this.http.post(`${environment.apiUrl}/admin/spaces`, this.form) : this.http.patch(`${environment.apiUrl}/admin/spaces/${this.editingId}`, this.form);
    request.subscribe({
      next: () => { this.showCreate = false; this.editingId = null; this.createError = ''; this.form = { buildingId: 0, name: '', floor: 0, type: 'study_room', capacity: 1, accessible: false, status: 'active' }; this.loadSpaces(); this.changeDetector.markForCheck(); },
      error: () => { this.createError = 'Dati dello spazio non validi.'; this.changeDetector.markForCheck(); },
    });
  }

  editSpace(space: AdminSpace): void {
    this.http.get<{ data: { id: number; building: { id: number }; name: string; floor: number; type: string; capacity: number; accessible: boolean; status: string } }>(`${environment.apiUrl}/admin/spaces/${space.id}`).subscribe({ next: response => { const item = response.data; this.editingId = item.id; this.form = { buildingId: item.building.id, name: item.name, floor: item.floor, type: item.type, capacity: item.capacity, accessible: item.accessible, status: item.status }; this.showCreate = true; this.changeDetector.markForCheck(); } });
  }

  removeSpace(space: AdminSpace): void {
    if (!window.confirm(`Eliminare lo spazio ${space.name}?`)) return;
    this.http.delete(`${environment.apiUrl}/admin/spaces/${space.id}`).subscribe({ next: () => this.loadSpaces(), error: () => { this.createError = 'Impossibile eliminare lo spazio.'; this.changeDetector.markForCheck(); } });
  }

  searchSpaces(value: string): void { this.search = value.trim(); this.loadSpaces(); }

  private loadSpaces(): void {
    const query = this.search ? `?search=${encodeURIComponent(this.search)}` : '';
    this.http.get<{ data: Array<{ id: number; name: string; building: { name: string }; capacity: number; type: string; status: string }> }>(`${environment.apiUrl}/admin/spaces${query}`)
      .subscribe({ next: response => { this.loadError = ''; this.spaces = response.data.map(space => ({
        id: space.id, name: space.name, icon: space.type === 'study_room' ? 'book-outline' : 'desktop-outline', building: space.building.name,
        capacity: space.capacity, status: space.status === 'active' ? 'available' : 'maintenance',
        statusLabel: space.status === 'active' ? 'Disponibile' : space.status === 'maintenance' ? 'Manutenzione' : 'Disattivato',
      })); this.changeDetector.markForCheck(); }, error: () => { this.spaces = []; this.loadError = 'Impossibile caricare gli spazi. Riprova ricaricando la pagina.'; this.changeDetector.markForCheck(); } });
  }

}
