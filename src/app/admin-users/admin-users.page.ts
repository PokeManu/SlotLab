import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IonContent } from '@ionic/angular';
import { environment } from '../../environments/environment';
import { AdminSidebarComponent } from '../admin-parts/admin-sidebar.component';
import { FormsModule } from '@angular/forms';

interface AdminUser { id: number; firstName: string; lastName: string; email: string; role: 'user' | 'admin'; createdAt: string; }

@Component({ selector: 'app-admin-users', templateUrl: './admin-users.page.html', styleUrls: ['./admin-users.page.scss'], imports: [IonContent, AdminSidebarComponent, FormsModule] })
export class AdminUsersPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  users: AdminUser[] = []; search = ''; page = 1; totalPages = 0; loading = false; error = '';
  ngOnInit(): void { this.loadUsers(); }
  loadUsers(): void {
    this.loading = true;
    this.error = '';
    this.changeDetector.markForCheck();
    const params = new URLSearchParams({ page: String(this.page), size: '20' });
    if (this.search.trim()) params.set('search', this.search.trim());
    this.http.get<{ data: AdminUser[]; pagination: { totalPages: number } }>(`${environment.apiUrl}/admin/users?${params}`).subscribe({
      next: response => { this.users = response.data; this.totalPages = response.pagination.totalPages; this.loading = false; this.changeDetector.markForCheck(); },
      error: () => { this.error = 'Impossibile caricare gli utenti.'; this.loading = false; this.changeDetector.markForCheck(); },
    });
  }
  onSearch(): void { this.page = 1; this.loadUsers(); }
  remove(user: AdminUser): void {
    if (user.role === 'admin' || !window.confirm(`Eliminare l'account di ${user.firstName} ${user.lastName}?`)) return;
    this.http.delete(`${environment.apiUrl}/admin/users/${user.id}`).subscribe({ next: () => this.loadUsers(), error: () => { this.error = 'Impossibile eliminare l’utente.'; this.changeDetector.markForCheck(); } });
  }
  previousPage(): void { if (this.page > 1) { this.page--; this.loadUsers(); } }
  nextPage(): void { if (this.page < this.totalPages) { this.page++; this.loadUsers(); } }
}
