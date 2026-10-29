import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { IonAlert, IonButton, IonContent, IonSearchbar, IonSpinner } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AdminUser, AdminUsersApi } from '../api/admin-users-api';
@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.page.html',
  styleUrls: ['./admin-users.page.scss'],
  imports: [IonAlert, IonButton, IonContent, IonSearchbar, IonSpinner],
})
export class AdminUsersPage implements OnInit, OnDestroy {
  private readonly usersApi = inject(AdminUsersApi);
  private readonly changeDetector = inject(ChangeDetectorRef);
  users: AdminUser[] = [];
  search = '';
  page = 1;
  totalPages = 0;
  loading = false;
  error = '';
  deletingId: number | null = null;
  confirmingUser: AdminUser | null = null;
  readonly deleteAlertButtons = [
    { text: 'Annulla', role: 'cancel' },
    { text: 'Elimina', role: 'destructive', handler: () => this.confirmRemoval() },
  ];
  private hasEntered = false;
  private loadRequest?: Subscription;
  private deleteRequest?: Subscription;
  ngOnInit(): void {
    this.loadUsers();
  }
  ionViewWillEnter(): void {
    if (this.hasEntered) this.loadUsers();
    this.hasEntered = true;
  }
  ngOnDestroy(): void {
    this.loadRequest?.unsubscribe();
    this.deleteRequest?.unsubscribe();
  }
  loadUsers(): void {
    this.loadRequest?.unsubscribe();
    this.loading = true;
    this.error = '';
    this.changeDetector.markForCheck();
    this.loadRequest = this.usersApi
      .list(this.page, this.search)
      .subscribe({
        next: (response) => {
          this.users = response.data;
          this.totalPages = response.pagination.totalPages;
          this.loading = false;
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.users = [];
          this.totalPages = 0;
          this.error = 'Impossibile caricare gli utenti.';
          this.loading = false;
          this.changeDetector.markForCheck();
        },
      });
  }
  onSearch(value = this.search): void {
    this.search = value;
    this.page = 1;
    this.loadUsers();
  }
  remove(user: AdminUser): void {
    if (
      this.deletingId !== null ||
      user.role === 'admin'
    )
      return;
    this.confirmingUser = user;
    this.changeDetector.markForCheck();
  }
  cancelRemoval(): void {
    this.confirmingUser = null;
  }
  confirmRemoval(): void {
    const user = this.confirmingUser;
    this.confirmingUser = null;
    if (!user || this.deletingId !== null || user.role === 'admin') return;
    this.loadRequest?.unsubscribe();
    this.loading = false;
    this.deletingId = user.id;
    this.error = '';
    this.changeDetector.markForCheck();
    this.deleteRequest = this.usersApi.remove(user.id).subscribe({
      next: () => {
        this.deletingId = null;
        this.loadUsers();
      },
      error: () => {
        this.deletingId = null;
        this.error = 'Impossibile eliminare l’utente.';
        this.changeDetector.markForCheck();
      },
    });
  }
  previousPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadUsers();
    }
  }
  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadUsers();
    }
  }
}
