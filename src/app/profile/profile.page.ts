import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon} from '@ionic/angular';
import { addIcons } from 'ionicons';
 import {
    accessibilityOutline,
    cameraOutline,
    chevronForwardOutline,
    flagOutline,
    notificationsOutline,
    personOutline,
    shieldCheckmarkOutline,
  } from 'ionicons/icons';
import { MobileNavigationComponent } from '../mobile-navigation/mobile-navigation.component';
import { TopbarComponent } from '../topbar-component/topbar-component.component';
import { Auth } from '../auth/auth';
import { environment } from '../../environments/environment';
import { finalize } from 'rxjs';
import { ThemeToggleComponent } from '../theme/theme-toggle.component';
interface ProfileMenuItem{
  label: string;
  icon:string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [
    IonContent,
    IonIcon,
    TopbarComponent,
    MobileNavigationComponent,
    RouterLink,
    ThemeToggleComponent,
  ],
})
export class ProfilePage implements OnInit, OnDestroy {

  readonly auth = inject(Auth);
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  readonly maximumPhotoBytes = 2 * 1024 * 1024;
  readonly acceptedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp'];
  profilePhotoUrl = '';
  photoError = '';
  photoSaving = false;
  get user() {
    const account = this.auth.user();
    return {
      initials: this.auth.initials,
      fullName: account ? `${account.firstName} ${account.lastName}` : '',
      role: this.auth.isAdmin() ? 'Amministratore' : 'Utente',
      email: account?.email ?? '',
    };
  }

  readonly menuItems: ProfileMenuItem[] = [
    {
      label: 'Dati personali',
      icon: 'person-outline',
    },
    {
      label: 'Preferenze notifiche',
      icon: 'notifications-outline',
    },
    {
      label: 'Le mie segnalazioni',
      icon: 'flag-outline',
    },
  ];

  constructor(){
      addIcons({
        accessibilityOutline,
        cameraOutline,
        chevronForwardOutline,
        flagOutline,
        notificationsOutline,
        personOutline,
        shieldCheckmarkOutline,
      });
  }

  ngOnInit(): void {
    this.loadProfilePhoto();
  }

  ngOnDestroy(): void {
    this.clearPhotoUrl();
  }

  selectProfilePhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!this.acceptedPhotoTypes.includes(file.type)) {
      this.photoError = 'Seleziona un’immagine JPEG, PNG o WebP.';
      return;
    }
    if (file.size === 0 || file.size > this.maximumPhotoBytes) {
      this.photoError = 'L’immagine deve avere una dimensione massima di 2 MB.';
      return;
    }

    this.photoSaving = true;
    this.photoError = '';
    this.http.put<void>(`${environment.apiUrl}/users/me/photo`, file, {
      headers: { 'Content-Type': file.type },
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.photoSaving = false; this.changeDetector.markForCheck(); }),
    ).subscribe({
      next: () => { this.setPhotoUrl(file); this.changeDetector.markForCheck(); },
      error: error => {
        this.photoError = error instanceof HttpErrorResponse && error.status === 413
          ? 'L’immagine supera il limite di 2 MB.'
          : 'Non è stato possibile salvare l’immagine. Verifica formato e dimensione.';
      },
    });
  }

  removeProfilePhoto(): void {
    if (!this.profilePhotoUrl || this.photoSaving) return;
    this.photoSaving = true;
    this.photoError = '';
    this.http.delete<void>(`${environment.apiUrl}/users/me/photo`).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.photoSaving = false; this.changeDetector.markForCheck(); }),
    ).subscribe({
      next: () => { this.clearPhotoUrl(); this.changeDetector.markForCheck(); },
      error: () => { this.photoError = 'Non è stato possibile rimuovere l’immagine.'; },
    });
  }

  private loadProfilePhoto(): void {
    this.http.get(`${environment.apiUrl}/users/me/photo`, { responseType: 'blob' }).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: photo => { this.setPhotoUrl(photo); this.changeDetector.markForCheck(); },
      error: error => {
        if (!(error instanceof HttpErrorResponse) || error.status !== 404) {
          this.photoError = 'Non è stato possibile caricare l’immagine del profilo.';
          this.changeDetector.markForCheck();
        }
      },
    });
  }

  private setPhotoUrl(photo: Blob): void {
    this.clearPhotoUrl();
    this.profilePhotoUrl = URL.createObjectURL(photo);
  }

  private clearPhotoUrl(): void {
    if (this.profilePhotoUrl) URL.revokeObjectURL(this.profilePhotoUrl);
    this.profilePhotoUrl = '';
  }

  logout(): void{
    this.auth.logout().subscribe({ error: () => {} });
  }
}
