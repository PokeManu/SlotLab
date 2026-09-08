import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, viewChild, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import * as L from 'leaflet';

import { environment } from '../../environments/environment';
import { allPages } from '../api/all-pages';

interface MapSpace {
  id: number;
  name: string;
  floor: number;
  type: string;
  capacity: number;
  building: { id: number };
}

interface MapBuilding {
  id: number;
  buildingNumber: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  spaces: MapSpace[];
}

@Component({
  selector: 'app-campus-map',
  templateUrl: './campus-map.component.html',
  styleUrls: ['./campus-map.component.scss'],
  imports: [],
})
export class CampusMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() eyebrow = 'Campus di Viale delle Scienze';
  @Input() heading = 'Esplora gli edifici';
  @Input() hint = 'Seleziona un edificio sulla mappa';

  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private request?: Subscription;
  private readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');
  private map?: L.Map;
  private markerLayer?: L.LayerGroup;
  buildings: MapBuilding[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    this.loadBuildings();
  }

  ngAfterViewInit(): void {
    this.initializeMap();
    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.map?.remove();
  }

  private loadBuildings(): void {
    this.request = forkJoin({
      buildings: this.http.get<{ data: Array<{ id: number; number: number; name: string; address: string; latitude: number; longitude: number }> }>(`${environment.apiUrl}/buildings`),
      spaces: allPages<MapSpace>(this.http, `${environment.apiUrl}/spaces?size=100`),
    }).subscribe({
      next: response => {
        const spacesByBuilding = new Map<number, MapSpace[]>();
        for (const space of response.spaces.data) {
          const buildingId = space.building.id;
          if (typeof buildingId !== 'number') continue;
          const current = spacesByBuilding.get(buildingId) ?? [];
          current.push(space);
          spacesByBuilding.set(buildingId, current);
        }
        this.buildings = response.buildings.data
          .filter(building => Number.isFinite(building.latitude) && Number.isFinite(building.longitude))
          .map(building => ({ ...building, buildingNumber: building.number, spaces: spacesByBuilding.get(building.id) ?? [] }));
        this.loading = false;
        this.error = '';
        this.addBuildingMarkers();
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.buildings = [];
        this.error = 'Impossibile caricare gli edifici e gli spazi della mappa.';
        this.changeDetector.markForCheck();
      },
    });
  }

  private initializeMap(): void {
    const container = this.mapContainer();
    if (!container) return;
    this.map = L.map(container.nativeElement).setView([38.1037, 13.348], 16);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
    this.markerLayer = L.layerGroup().addTo(this.map);
    this.addBuildingMarkers();
  }

  private addBuildingMarkers(): void {
    if (!this.markerLayer) return;
    this.markerLayer.clearLayers();
    for (const building of this.buildings) {
      const markerIcon = L.divIcon({
        className: 'campus-building-marker',
        html: `<span class="campus-building-marker__badge">${this.escapeHtml(String(building.buildingNumber))}</span>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
      });
      const marker = L.marker([building.latitude, building.longitude], { icon: markerIcon, title: building.name });
      marker.bindPopup(this.popupHtml(building));
      marker.on('popupopen', event => {
        const element = event.popup.getElement() as HTMLElement | undefined;
        element?.querySelectorAll<HTMLAnchorElement>('a[data-space-id]').forEach(link => {
          link.onclick = click => {
            click.preventDefault();
            void this.router.navigate(['/spaces', link.dataset['spaceId']]);
          };
        });
      });
      marker.addTo(this.markerLayer);
    }
    if (this.buildings.length) {
      this.map?.fitBounds(L.latLngBounds(this.buildings.map(building => [building.latitude, building.longitude] as [number, number])), { padding: [35, 35], maxZoom: 16 });
    }
  }

  private popupHtml(building: MapBuilding): string {
    const name = this.escapeHtml(building.name);
    const address = this.escapeHtml(building.address);
    const summary = building.spaces.length
      ? `${building.spaces.length} ${building.spaces.length === 1 ? 'spazio registrato' : 'spazi registrati'} · ${this.floorSummary(building.spaces)}`
      : 'Nessuno spazio registrato';
    const types = [...new Set(building.spaces.map(space => this.typeLabel(space.type)))].join(', ');
    const links = building.spaces.map(space => `<li><a href="/spaces/${Number(space.id)}" data-space-id="${Number(space.id)}">${this.escapeHtml(space.name)}</a></li>`).join('');
    return `<article class="campus-popup"><p class="campus-popup__eyebrow">Viale delle Scienze</p><h3 class="campus-popup__title">${name}</h3><p class="campus-popup__uses">${this.escapeHtml(types || 'Edificio senza spazi')}</p><p class="campus-popup__floors">${this.escapeHtml(summary)}</p><p class="campus-popup__address">${address}</p><ul>${links}</ul></article>`;
  }

  private floorSummary(spaces: MapSpace[]): string {
    const floors = [...new Set(spaces.map(space => space.floor))].sort((first, second) => first - second);
    return floors.map(floor => `piano ${floor}`).join(', ');
  }

  private typeLabel(type: string): string {
    return { study_room: 'Aule studio', laboratory: 'Laboratori', meeting_room: 'Sale riunioni' }[type] ?? type;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character));
  }
}
