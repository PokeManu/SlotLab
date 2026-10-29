import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { IonAlert, IonButton, IonContent, IonInput } from '@ionic/angular';
import { finalize } from 'rxjs';
import {
  AdminBuilding,
  AdminBuildingPayload,
  AdminBuildingsApi,
} from '../api/admin-buildings-api';
function nonBlank(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() ? null : { required: true };
}
const defaultBuilding = {
  number: 0,
  name: '',
  address: '',
  latitude: 38.1157,
  longitude: 13.3615,
};
@Component({
  selector: 'app-admin-buildings',
  templateUrl: './admin-buildings.page.html',
  styleUrls: ['./admin-buildings.page.scss'],
  imports: [IonAlert, IonButton, IonContent, IonInput, ReactiveFormsModule],
})
export class AdminBuildingsPage implements OnInit {
  private readonly buildingsApi = inject(AdminBuildingsApi);
  private readonly changeDetector = inject(ChangeDetectorRef);
  editingId: number | null = null;
  buildings: AdminBuilding[] = [];
  error = '';
  saving = false;
  deletingId: number | null = null;
  pendingDelete: AdminBuilding | null = null;
  readonly deleteButtons = [
    { text: 'Annulla', role: 'cancel' },
    { text: 'Elimina', role: 'destructive', handler: () => this.confirmRemove() },
  ];
  attemptedSubmit = false;
  readonly form = new FormGroup({
    number: new FormControl<number | null>(defaultBuilding.number, [
      Validators.required,
      Validators.min(1),
      Validators.pattern(/^\d+$/),
    ]),
    name: new FormControl(defaultBuilding.name, {
      nonNullable: true,
      validators: [Validators.required, nonBlank],
    }),
    address: new FormControl(defaultBuilding.address, {
      nonNullable: true,
      validators: [Validators.required, nonBlank],
    }),
    latitude: new FormControl<number | null>(defaultBuilding.latitude, [
      Validators.required,
      Validators.min(-90),
      Validators.max(90),
    ]),
    longitude: new FormControl<number | null>(defaultBuilding.longitude, [
      Validators.required,
      Validators.min(-180),
      Validators.max(180),
    ]),
  });
  showError(name: keyof AdminBuildingsPage['form']['controls']): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.attemptedSubmit);
  }
  ngOnInit(): void {
    this.load();
  }
  load(): void {
    this.buildingsApi.list().subscribe({
      next: (buildings) => {
        this.buildings = buildings;
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
    if (this.saving || this.deletingId !== null || this.pendingDelete !== null) return;
    this.attemptedSubmit = true;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const payload: AdminBuildingPayload = {
      number: Number(value.number),
      name: value.name,
      address: value.address,
      latitude: Number(value.latitude),
      longitude: Number(value.longitude),
    };
    this.saving = true;
    this.form.disable();
    const request =
      this.editingId === null
        ? this.buildingsApi.create(payload)
        : this.buildingsApi.update(this.editingId, payload);
    request
      .pipe(
        finalize(() => {
          this.saving = false;
          this.form.enable();
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.editingId = null;
          this.form.reset(defaultBuilding);
          this.attemptedSubmit = false;
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
  edit(building: AdminBuilding): void {
    if (this.saving || this.deletingId !== null) return;
    this.editingId = building.id;
    const { id, ...form } = building;
    this.form.reset(form);
    this.attemptedSubmit = false;
    this.error = '';
  }
  remove(building: AdminBuilding): void {
    if (this.saving || this.deletingId !== null) return;
    this.pendingDelete = building;
  }
  confirmRemove(): void {
    const building = this.pendingDelete;
    if (!building || this.deletingId !== null) return;
    this.pendingDelete = null;
    this.deletingId = building.id;
    this.buildingsApi.remove(building.id).pipe(finalize(() => {
      this.deletingId = null;
      this.changeDetector.markForCheck();
    })).subscribe({
      next: () => this.load(),
      error: () => {
        this.error = 'L’edificio non può essere eliminato.';
        this.changeDetector.markForCheck();
      },
    });
  }
}
