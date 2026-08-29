import { SpaceSummary } from '../models/space-summary.model';
import { SPACES } from './spaces.data';

export const RECOMMENDED_SPACES: SpaceSummary[] = SPACES.slice(0, 3);
