import { BookingGroup } from '../models/booking-list-item.model';

export const UPCOMING_BOOKING_GROUPS: readonly BookingGroup[] = [
  {
    dateLabel: 'Oggi',
    bookings: [
      {
        id: 'booking-001',
        spaceName: 'Aula Studio A3',
        spaceType: 'study-room',
        status: 'confirmed',
        dateLabel: 'Oggi',
        startTime: '10:00',
        endTime: '12:00',
        building: 'Edificio 6',
        floor: 2,
        participants: 4,
      },
    ],
  },
  {
    dateLabel: 'Lunedì 25 agosto',
    bookings: [
      {
        id: 'booking-002',
        spaceName: 'Laboratorio Web',
        spaceType: 'laboratory',
        status: 'confirmed',
        dateLabel: 'Lunedì 25 agosto',
        startTime: '14:00',
        endTime: '16:00',
        building: 'Edificio 9',
        floor: 3,
        participants: 18,
      },
    ],
  },
];
