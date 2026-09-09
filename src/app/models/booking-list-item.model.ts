import { BookingSummary } from './booking-summary.model';

export type BookingSpaceType =
  | 'study-room'
  | 'laboratory';

export interface BookingListItem extends BookingSummary {
  spaceId?: string;
  spaceType: BookingSpaceType;
  dateValue?: string;
}

export interface BookingGroup {
  dateLabel: string;
  bookings: readonly BookingListItem[];
}
