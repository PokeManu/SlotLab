export type BookingStatus = 'confirmed' | 'cancelled';
export interface BookingSummary {
  id: string;
  spaceName: string;
  status: BookingStatus;
  dateLabel: string;
  startTime: string;
  endTime: string;
  building: string;
  floor: number;
  participants: number;
}
