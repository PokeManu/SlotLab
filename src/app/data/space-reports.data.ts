import { SpaceReport } from '../models/space-report.model';
import { findSpace } from './spaces.data';
const aulaStudio = findSpace('aula-studio-a1');
const laboratorioReti = findSpace('laboratorio-reti');
const salaRiunioni = findSpace('sala-riunioni-b');
export const SPACE_REPORTS: readonly SpaceReport[] = [
  {
    id: 'report-001',
    spaceId: aulaStudio.id,
    spaceName: aulaStudio.name,
    building: aulaStudio.building,
    floor: aulaStudio.floor,
    category: 'equipment',
    description: 'Una presa elettrica vicino alla finestra non funziona.',
    dateLabel: '28 agosto 2026',
    status: 'in-progress',
  },
  {
    id: 'report-002',
    spaceId: laboratorioReti.id,
    spaceName: laboratorioReti.name,
    building: laboratorioReti.building,
    floor: laboratorioReti.floor,
    category: 'cleaning',
    description: 'Alcune postazioni necessitano di pulizia.',
    dateLabel: '24 agosto 2026',
    status: 'submitted',
  },
  {
    id: 'report-003',
    spaceId: salaRiunioni.id,
    spaceName: salaRiunioni.name,
    building: salaRiunioni.building,
    floor: salaRiunioni.floor,
    category: 'accessibility',
    description: 'La porta di accesso risultava difficile da aprire.',
    dateLabel: '18 agosto 2026',
    status: 'resolved',
  },
];
