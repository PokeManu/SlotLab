export type ReportCategory =
  | 'equipment'
  | 'cleaning'
  | 'accessibility'
  | 'other';

export type ReportStatus =
  | 'submitted'
  | 'in-progress'
  | 'resolved';

export interface SpaceReport {
  id: string;
  photo?: string | null;
  spaceId: string;
  spaceName: string;
  building: string;
  floor: number;
  category: ReportCategory;
  description: string;
  dateLabel: string;
  status: ReportStatus;
}