import { FavoriteSpace } from '../models/favorite-space.model';

import { findSpace } from './spaces.data';

export const FAVORITE_SPACES: FavoriteSpace[] = [
  {
    ...findSpace('aula-studio-a1'),
    availability: 'Disponibile fino alle 12:30',
    availabilityTone: 'available',
  },
  {
    ...findSpace('laboratorio-reti'),
    availability: 'Disponibile dalle 11:00',
    availabilityTone: 'available',
  },
  {
    ...findSpace('sala-riunioni-b'),
    availability: 'Disponibile dalle 15:00',
    availabilityTone: 'warning',
  },
];