import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { NotificationsApi, NotificationDto } from '../api/notifications-api';
import { Auth } from '../auth/auth';
import { NotificationState } from './notification-state';

describe('NotificationState', () => {
  it('scarta letture obsolete dopo un cambio account e annulla il refresh precedente', () => {
    let userId = 1;
    let version = 1;
    const requests: Subject<NotificationDto[]>[] = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Auth,
          useValue: {
            user: () => ({ id: userId }),
            get sessionVersion() { return version; },
          },
        },
        {
          provide: NotificationsApi,
          useValue: {
            list: () => {
              const request = new Subject<NotificationDto[]>();
              requests.push(request);
              return request.asObservable();
            },
          },
        },
      ],
    });
    const state = TestBed.inject(NotificationState);
    state.refresh();
    userId = 2;
    version = 2;
    state.set(0);
    state.refresh();
    expect(requests[0].observers.length).toBe(0);
    requests[0].next([{ id: 1, read: false } as NotificationDto]);
    expect(state.unreadCount()).toBe(0);
    requests[1].next([{ id: 2, read: false } as NotificationDto]);
    expect(state.unreadCount()).toBe(1);
  });
});
