export interface Space {
  id: string;
  name: string;
  type: string;
  building: string;
  floor: number;
  seats: number;
  accessible: boolean;
  image: string;
  services: string[];
}
export const SPACES: Space[] = [
  {
    id: 'aula-studio-a1',
    name: 'Aula Studio A1',
    type: 'Aula studio',
    building: 'Edificio 6',
    floor: 2,
    seats: 24,
    accessible: true,
    image: 'assets/images/AulaStudioA1.jpg',
    services: ['Wi-Fi', 'Prese elettriche', 'Lavagna'],
  },
  {
    id: 'laboratorio-reti',
    name: 'Laboratorio Reti',
    type: 'Laboratorio',
    building: 'Edificio 9',
    floor: 1,
    seats: 18,
    accessible: true,
    image: 'assets/images/AulaStudioA1.jpg',
    services: ['Wi-Fi', 'Computer', 'Proiettore'],
  },
  {
    id: 'sala-riunioni-b',
    name: 'Sala Riunioni B',
    type: 'Sala riunioni',
    building: 'Edificio 6',
    floor: 1,
    seats: 12,
    accessible: true,
    image: 'assets/images/AulaStudioA1.jpg',
    services: ['Wi-Fi', 'Monitor', 'Lavagna'],
  },
];
export function findSpace(id: string | null): Space {
  return SPACES.find((space) => space.id === id) ?? SPACES[0];
}
