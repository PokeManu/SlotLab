import { allPages } from '../api/all-pages';
import { SpaceQrComponent } from '../space-qr/space-qr.component';
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
  gridOutline,
  searchOutline,
  trashOutline,
} from 'ionicons/icons';
interface AdminSpace {
  id: number;
  name: string;
  icon: string;
  building: string;
  type: string;
  capacity: number;
  status: 'available' | 'in-use' | 'maintenance';
  statusLabel: string;
}
@Component({
  selector: 'app-admin-spaces',
  templateUrl: './admin-spaces.page.html',
  styleUrls: ['./admin-spaces.page.scss'],
  imports: [
    SpaceQrComponent,
    SpaceSearchComponent,
    AdminSidebarComponent,
    IonContent,
    IonIcon,
    FormsModule,
  ],
})
export class AdminSpacesPage implements OnInit {
  readonly services = [
    { code: 'wifi', label: 'Wi-Fi' },
    { code: 'power_outlets', label: 'Prese' },
    { code: 'projector', label: 'Proiettore' },
    { code: 'computer', label: 'Computer' },
    { code: 'air_conditioning', label: 'Aria condizionata' },
  ];
  toggleService(code: string): void {
    this.form.serviceCodes = this.form.serviceCodes.includes(code)
      ? this.form.serviceCodes.filter((item) => item !== code)
      : [...this.form.serviceCodes, code];
  }
  onStatusChange(): void {
    if (this.form.status !== 'active') this.form.accessible = false;
  }
  qrSpaceId: number | null = null;
  readonly auth = inject(Auth);
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  spaces: AdminSpace[] = [];
  buildings: Array<{
    id: number;
    name: string;
  }> = [];
  showCreate = false;
  editingId: number | null = null;
  createError = '';
  loadError = '';
  form = {
    buildingId: 0,
    name: '',
    floor: 0,
    type: 'study_room',
    capacity: 1,
    accessible: false,
    status: 'active',
    serviceCodes: [] as string[],
  };
  private search = '';
  filterBuilding = '';
  filterType = '';
  filterStatus = '';
  currentPage = 1;
  readonly pageSize = 20;
  get filteredSpaces() {
    return this.spaces.filter(
      (s) =>
        (!this.filterBuilding || s.building === this.filterBuilding) &&
        (!this.filterType || s.type === this.filterType) &&
        (!this.filterStatus || s.statusLabel === this.filterStatus),
    );
  }
  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredSpaces.length / this.pageSize));
  }
  get visibleSpaces() {
    return this.filteredSpaces.slice(
      (this.currentPage - 1) * this.pageSize,
      this.currentPage * this.pageSize,
    );
  }
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
      gridOutline,
      searchOutline,
      trashOutline,
    });
  }
  ngOnInit(): void {
    allPages<{
      id: number;
      name: string;
    }>(this.http, `${environment.apiUrl}/admin/buildings`).subscribe({
      next: (response) => {
        this.buildings = response.data;
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.loadError = 'Impossibile caricare gli edifici.';
        this.changeDetector.markForCheck();
      },
    });
    this.route.queryParams.subscribe((params) => {
      this.search =
        typeof params['search'] === 'string' ? params['search'].trim() : '';
      this.loadSpaces();
    });
  }
  saveSpace(): void {
    const request =
      this.editingId === null
        ? this.http.post(`${environment.apiUrl}/admin/spaces`, this.form)
        : this.http.patch(
            `${environment.apiUrl}/admin/spaces/${this.editingId}`,
            this.form,
          );
    request.subscribe({
      next: () => {
        this.showCreate = false;
        this.editingId = null;
        this.createError = '';
        this.form = {
          buildingId: 0,
          name: '',
          floor: 0,
          type: 'study_room',
          capacity: 1,
          accessible: false,
          status: 'active',
          serviceCodes: [] as string[],
        };
        this.loadSpaces();
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.createError = 'Dati dello spazio non validi.';
        this.changeDetector.markForCheck();
      },
    });
  }
  editSpace(space: AdminSpace): void {
    this.http
      .get<{
        data: {
          id: number;
          building: {
            id: number;
          };
          name: string;
          floor: number;
          type: string;
          capacity: number;
          accessible: boolean;
          status: string;
          serviceCodes: string[];
        };
      }>(`${environment.apiUrl}/admin/spaces/${space.id}`)
      .subscribe({
        next: (response) => {
          const item = response.data;
          this.editingId = item.id;
          this.form = {
            buildingId: item.building.id,
            name: item.name,
            floor: item.floor,
            type: item.type,
            capacity: item.capacity,
            accessible: item.accessible,
            status: item.status,
            serviceCodes: item.serviceCodes ?? [],
          };
          this.showCreate = true;
          this.changeDetector.markForCheck();
        },
      });
  }
  removeSpace(space: AdminSpace): void {
    if (!window.confirm(`Eliminare lo spazio ${space.name}?`)) return;
    this.http
      .delete(`${environment.apiUrl}/admin/spaces/${space.id}`)
      .subscribe({
        next: () => this.loadSpaces(),
        error: () => {
          this.createError = 'Impossibile eliminare lo spazio.';
          this.changeDetector.markForCheck();
        },
      });
  }
  searchSpaces(value: string): void {
    this.search = value.trim();
    this.loadSpaces();
  }
  private loadSpaces(): void {
    const query = this.search
      ? `?search=${encodeURIComponent(this.search)}`
      : '';
    allPages<{
      id: number;
      name: string;
      building: {
        name: string;
      };
      capacity: number;
      type: string;
      status: string;
    }>(this.http, `${environment.apiUrl}/admin/spaces${query}`).subscribe({
      next: (response) => {
        this.loadError = '';
        this.currentPage = 1;
        this.spaces = response.data.map((space) => ({
          id: space.id,
          name: space.name,
          type: space.type,
          icon:
            space.type === 'study_room' ? 'book-outline' : 'desktop-outline',
          building: space.building.name,
          capacity: space.capacity,
          status: space.status === 'active' ? 'available' : 'maintenance',
          statusLabel:
            space.status === 'active'
              ? 'Disponibile'
              : space.status === 'maintenance'
                ? 'Manutenzione'
                : 'Disattivato',
        }));
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.spaces = [];
        this.loadError =
          'Impossibile caricare gli spazi. Riprova ricaricando la pagina.';
        this.changeDetector.markForCheck();
      },
    });
  }
}
