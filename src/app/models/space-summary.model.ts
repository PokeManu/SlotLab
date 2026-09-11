export interface SpaceSummary {
  id: string;
  name: string;
  type: string;
  building: string;
  floor: number;
  seats: number;
  image?: string;
  status?: 'active' | 'maintenance' | 'deactivated';
}
