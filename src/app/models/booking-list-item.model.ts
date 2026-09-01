import { BookingSummary } from './booking-summary.model';

export type BookingSpaceType =
  | 'study-room'
  | 'laboratory';

export interface BookingListItem extends BookingSummary {
  spaceType: BookingSpaceType;
  canCheckIn: boolean;
}

export interface BookingGroup {
  dateLabel: string;
  bookings: readonly BookingListItem[];
}
