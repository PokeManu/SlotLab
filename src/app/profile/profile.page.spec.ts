import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ProfilePage } from './profile.page';

describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:profile-photo') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne('/api/v1/users/me/photo').flush(new Blob(), { status: 404, statusText: 'Not Found' });
  });

  afterEach(() => http.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carica una foto valida e aggiorna subito l’anteprima', () => {
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'profilo.png', { type: 'image/png' });
    const input = { files: [file], value: 'profilo.png' } as unknown as HTMLInputElement;

    component.selectProfilePhoto({ target: input } as unknown as Event);
    const request = http.expectOne('/api/v1/users/me/photo');
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('Content-Type')).toBe('image/png');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(component.profilePhotoUrl).toBe('blob:profile-photo');
  });

  it('rifiuta nel browser formato e dimensione non consentiti', () => {
    const invalid = new File(['test'], 'profilo.gif', { type: 'image/gif' });
    component.selectProfilePhoto({ target: { files: [invalid], value: 'profilo.gif' } } as unknown as Event);
    http.expectNone('/api/v1/users/me/photo');
    expect(component.photoError).toContain('JPEG');

    const large = new File([new Uint8Array(component.maximumPhotoBytes + 1)], 'profilo.png', { type: 'image/png' });
    component.selectProfilePhoto({ target: { files: [large], value: 'profilo.png' } } as unknown as Event);
    http.expectNone('/api/v1/users/me/photo');
    expect(component.photoError).toContain('2 MB');
  });
});
