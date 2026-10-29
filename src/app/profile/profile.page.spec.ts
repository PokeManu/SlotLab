import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ProfilePage } from './profile.page';
import { Auth } from '../auth/auth';
describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = vi.fn(() => 'blob:profile-photo');
        static override revokeObjectURL = vi.fn();
      },
    );
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(Auth)
      .login({ email: 'anna@example.test', password: 'Password2026!' })
      .subscribe();
    http.expectOne('/api/v1/auth/login').flush({
      data: {
        accessToken: 'test-token',
        user: {
          id: 1,
          firstName: 'Anna',
          lastName: 'Rossi',
          email: 'anna@example.test',
          role: 'user',
        },
      },
    });
    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http
      .expectOne('/api/v1/users/me/photo')
      .flush(new Blob(), { status: 404, statusText: 'Not Found' });
  });
  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('mostra le azioni del profilo come voci Ionic con destinazioni distinte', () => {
    const destinations = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('ion-list ion-item'),
    ).map((item) => item.getAttribute('href'));
    expect(destinations).toEqual([
      '/profile/password',
      '/reports',
      '/profile/delete',
    ]);
    expect(fixture.nativeElement.querySelector('ion-button.profile__logout'))
      .not.toBeNull();
  });
  it('carica una foto valida e aggiorna subito l’anteprima', () => {
    const file = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
      'profilo.png',
      { type: 'image/png' },
    );
    const input = {
      files: [file],
      value: 'profilo.png',
    } as unknown as HTMLInputElement;
    component.selectProfilePhoto({ target: input } as unknown as Event);
    const request = http.expectOne('/api/v1/users/me/photo');
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('Content-Type')).toBe('image/png');
    request.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();
    expect(component.profilePhotoUrl).toBe('blob:profile-photo');
    expect(
      (
        fixture.nativeElement.querySelector(
          '.profile__avatar img',
        ) as HTMLImageElement
      ).src,
    ).toContain('blob:profile-photo');
  });
  it('rimuove la foto dal server e dall’anteprima solo dopo la risposta', () => {
    const file = new File(['foto'], 'profilo.png', { type: 'image/png' });
    component.selectProfilePhoto({
      target: { files: [file], value: 'profilo.png' },
    } as unknown as Event);
    http.expectOne('/api/v1/users/me/photo').flush(null, {
      status: 204,
      statusText: 'No Content',
    });
    expect(component.profilePhotoUrl).toBe('blob:profile-photo');
    component.removeProfilePhoto();
    const request = http.expectOne('/api/v1/users/me/photo');
    expect(request.request.method).toBe('DELETE');
    expect(component.profilePhotoUrl).toBe('blob:profile-photo');
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(component.profilePhotoUrl).toBe('');
  });
  it('rifiuta nel browser formato e dimensione non consentiti', () => {
    const invalid = new File(['test'], 'profilo.gif', { type: 'image/gif' });
    component.selectProfilePhoto({
      target: { files: [invalid], value: 'profilo.gif' },
    } as unknown as Event);
    http.expectNone('/api/v1/users/me/photo');
    expect(component.photoError).toContain('JPEG');
    const large = new File(
      [new Uint8Array(component.maximumPhotoBytes + 1)],
      'profilo.png',
      { type: 'image/png' },
    );
    component.selectProfilePhoto({
      target: { files: [large], value: 'profilo.png' },
    } as unknown as Event);
    http.expectNone('/api/v1/users/me/photo');
    expect(component.photoError).toContain('2 MB');
  });
});
