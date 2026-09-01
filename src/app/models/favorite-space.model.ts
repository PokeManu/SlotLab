import { SpaceSummary } from './space-summary.model';

export interface FavoriteSpace extends SpaceSummary {
  availability: string;
  availabilityTone: 'available' | 'warning';
}