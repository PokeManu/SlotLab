import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonItem, IonList } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cameraOutline } from 'ionicons/icons';
import { Auth } from '../auth/auth';
import { finalize } from 'rxjs';
import { ThemeToggleComponent } from '../theme/theme-toggle.component';
import { ProfilePhoto } from './profile-photo';
@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [
    IonButton,
    IonContent,
    IonIcon,
    IonItem,
    IonList,
    RouterLink,
    ThemeToggleComponent,
  ],
})
export class ProfilePage implements OnInit {
  readonly auth = inject(Auth);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly profilePhoto = inject(ProfilePhoto);
  readonly maximumPhotoBytes = 2 * 1024 * 1024;
  readonly acceptedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp'];
  get profilePhotoUrl() {
    return this.profilePhoto.url();
  }
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
  constructor() {
    addIcons({ cameraOutline });
  }
  ngOnInit(): void {
    this.loadProfilePhoto();
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
    const userId = this.auth.user()?.id;
    if (!userId) return;
    this.photoSaving = true;
    this.photoError = '';
    this.profilePhoto
      .upload(userId, file)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.photoSaving = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.changeDetector.markForCheck();
        },
        error: (error) => {
          this.photoError =
            error instanceof HttpErrorResponse && error.status === 413
              ? 'L’immagine supera il limite di 2 MB.'
              : 'Non è stato possibile salvare l’immagine. Verifica formato e dimensione.';
        },
      });
  }
  removeProfilePhoto(): void {
    if (!this.profilePhotoUrl || this.photoSaving) return;
    const userId = this.auth.user()?.id;
    if (!userId) return;
    this.photoSaving = true;
    this.photoError = '';
    this.profilePhoto
      .delete(userId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.photoSaving = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.photoError = 'Non è stato possibile rimuovere l’immagine.';
        },
      });
  }
  private loadProfilePhoto(): void {
    const userId = this.auth.user()?.id;
    if (!userId) return;
    this.profilePhoto
      .load(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.photoError =
            'Non è stato possibile caricare l’immagine del profilo.';
          this.changeDetector.markForCheck();
        },
      });
  }
  logout(): void {
    this.auth.logout().subscribe({ error: () => {} });
  }
}
