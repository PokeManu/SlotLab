import {
  AdminSpacesApi,
} from '../api/admin-spaces-api';
import { SpaceQrComponent } from '../space-qr/space-qr.component';
import { SpaceSearchComponent } from '../admin-parts/space-search.component';
import { Auth } from '../auth/auth';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonButton,
  IonAlert,
  IonCheckbox,
  IonContent,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
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
function nonBlank(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() ? null : { required: true };
}
function defaultSpaceForm() {
  return {
    buildingId: 0,
    name: '',
    floor: 0,
    type: 'study_room',
    capacity: 1,
    accessible: false,
    status: 'active',
    serviceCodes: [] as string[],
  };
}
@Component({
  selector: 'app-admin-spaces',
  templateUrl: './admin-spaces.page.html',
  styleUrls: ['./admin-spaces.page.scss'],
  imports: [
    SpaceQrComponent,
    SpaceSearchComponent,
    IonContent,
    IonIcon,
    IonButton,
    IonAlert,
    IonCheckbox,
    IonInput,
    IonSelect,
    IonSelectOption,
    FormsModule,
    ReactiveFormsModule,
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
  setService(code: string, checked: boolean): void {
    const control = this.form.controls.serviceCodes;
    const selected = control.value;
    control.setValue(
      checked
        ? selected.includes(code) ? selected : [...selected, code]
        : selected.filter((item) => item !== code),
    );
  }
  onStatusChange(status: string): void {
    const accessible = this.form.controls.accessible;
    if (status !== 'active') {
      accessible.setValue(false);
      accessible.disable();
    } else if (!this.saving) {
      accessible.enable();
    }
  }
  showError(name: keyof AdminSpacesPage['form']['controls']): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.attemptedSubmit);
  }
  startCreate(): void {
    if (this.saving || this.deletingId !== null) return;
    this.editingId = null;
    this.createError = '';
    this.attemptedSubmit = false;
    this.form.reset(defaultSpaceForm());
    this.onStatusChange('active');
    this.showCreate = true;
  }
  closeForm(): void {
    if (this.saving || this.deletingId !== null) return;
    this.showCreate = false;
    this.editingId = null;
    this.createError = '';
  }
  qrSpaceId: number | null = null;
  readonly auth = inject(Auth);
  private readonly spacesApi = inject(AdminSpacesApi);
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
  saving = false;
  deletingId: number | null = null;
  pendingDelete: AdminSpace | null = null;
  readonly deleteButtons = [
    { text: 'Annulla', role: 'cancel' },
    { text: 'Elimina', role: 'destructive', handler: () => this.confirmRemoveSpace() },
  ];
  attemptedSubmit = false;
  readonly form = new FormGroup({
    buildingId: new FormControl<number | null>(0, [
      Validators.required,
      Validators.min(1),
      Validators.pattern(/^\d+$/),
    ]),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, nonBlank],
    }),
    floor: new FormControl<number | null>(0, [
      Validators.required,
      Validators.pattern(/^-?\d+$/),
    ]),
    type: new FormControl('study_room', { nonNullable: true }),
    capacity: new FormControl<number | null>(1, [
      Validators.required,
      Validators.min(1),
      Validators.pattern(/^\d+$/),
    ]),
    accessible: new FormControl(false, { nonNullable: true }),
    status: new FormControl('active', { nonNullable: true }),
    serviceCodes: new FormControl<string[]>([], { nonNullable: true }),
  });
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
    this.spacesApi.buildings().subscribe({
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
    if (this.saving || this.deletingId !== null || this.pendingDelete !== null) return;
    this.attemptedSubmit = true;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const payload = {
      buildingId: Number(value.buildingId),
      name: value.name,
      floor: Number(value.floor),
      type: value.type,
      capacity: Number(value.capacity),
      accessible: value.status === 'active' && value.accessible,
      status: value.status,
      serviceCodes: value.serviceCodes,
    };
    this.saving = true;
    this.form.disable();
    const request =
      this.editingId === null
        ? this.spacesApi.create(payload)
        : this.spacesApi.update(this.editingId, payload);
    request.pipe(finalize(() => {
      this.saving = false;
      this.form.enable();
      this.onStatusChange(this.form.controls.status.value);
      this.changeDetector.markForCheck();
    })).subscribe({
      next: () => {
        this.showCreate = false;
        this.editingId = null;
        this.createError = '';
        this.attemptedSubmit = false;
        this.form.reset(defaultSpaceForm());
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
    if (this.saving || this.deletingId !== null) return;
    this.spacesApi
      .detail(space.id)
      .subscribe({
        next: (response) => {
          const item = response.data;
          this.editingId = item.id;
          this.form.reset({
            buildingId: item.building.id,
            name: item.name,
            floor: item.floor,
            type: item.type,
            capacity: item.capacity,
            accessible: item.accessible,
            status: item.status,
            serviceCodes: item.serviceCodes ?? [],
          });
          this.onStatusChange(item.status);
          this.attemptedSubmit = false;
          this.createError = '';
          this.showCreate = true;
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.createError = 'Impossibile caricare lo spazio da modificare.';
          this.changeDetector.markForCheck();
        },
      });
  }
  removeSpace(space: AdminSpace): void {
    if (this.saving || this.deletingId !== null) return;
    this.pendingDelete = space;
  }
  confirmRemoveSpace(): void {
    const space = this.pendingDelete;
    if (!space || this.deletingId !== null) return;
    this.pendingDelete = null;
    this.deletingId = space.id;
    this.spacesApi
      .remove(space.id)
      .pipe(finalize(() => {
        this.deletingId = null;
        this.changeDetector.markForCheck();
      }))
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
    this.spacesApi.list(this.search).subscribe({
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
