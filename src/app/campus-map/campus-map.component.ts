import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  viewChild,
} from '@angular/core';

import * as L from 'leaflet';

import { CAMPUS_BUILDINGS } from '../data/campus-buildings.data';
import { CampusBuilding } from '../models/campus-building.models';

@Component({
  selector: 'app-campus-map',
  templateUrl: './campus-map.component.html',
  styleUrls: ['./campus-map.component.scss'],
  imports: [],
})
export class CampusMapComponent implements AfterViewInit, OnDestroy {
  @Input() eyebrow = 'Campus di Viale delle Scienze';
  @Input() heading = 'Esplora gli edifici';
  @Input() hint = 'Seleziona un edificio sulla mappa';

  private mapContainer =
    viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  private map?: L.Map;

  ngAfterViewInit(): void {
    this.initializeMap();

    setTimeout(() => {
      this.map?.invalidateSize();
    }, 200);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initializeMap(): void {
    const mapContainer = this.mapContainer();

    if (!mapContainer) {
      return;
    }

    this.map = L.map(mapContainer.nativeElement).setView(
      [38.1037, 13.348],
      16
    );

    L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    ).addTo(this.map);

    this.addBuildingMarkers();
  }

  private addBuildingMarkers(): void {
    const map = this.map;

    if (!map) {
      return;
    }

    CAMPUS_BUILDINGS.forEach((building) => {
      const markerIcon = L.divIcon({
        className: 'campus-building-marker',
        html: `
          <span class="campus-building-marker__badge">
            ${building.buildingNumber}
          </span>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
      });

      const marker = L.marker(
        [
          building.coordinates.latitude,
          building.coordinates.longitude
        ],
        {
          icon: markerIcon,
          title: building.name
        }
      );

      marker.addTo(map);

      const floorSummary = this.getFloorSummary(building);

      marker.bindPopup(`
        <article class="campus-popup">
          <p class="campus-popup__eyebrow">
            Viale delle Scienze
          </p>

          <h3 class="campus-popup__title">
            ${building.name}
          </h3>

          <p class="campus-popup__uses">
            ${building.uses.join(', ')}
          </p>

          <p class="campus-popup__floors">
            ${floorSummary}
          </p>

          <p class="campus-popup__address">
            ${building.address}
          </p>
        </article>
      `);
    });
  }

  private getFloorSummary(building: CampusBuilding): string {
    const aboveGroundFloors = building.aboveGroundFloors;
    const basementFloors = building.basementFloors;

    if (aboveGroundFloors === null) {
      return 'Numero di piani non disponibile';
    }

    const aboveGroundLabel =
      aboveGroundFloors === 1
        ? '1 piano fuori terra'
        : `${aboveGroundFloors} piani fuori terra`;

    if (basementFloors === null || basementFloors === 0) {
      return aboveGroundLabel;
    }

    const basementLabel =
      basementFloors === 1
        ? '1 piano interrato'
        : `${basementFloors} piani interrati`;

    return `${aboveGroundLabel} · ${basementLabel}`;
  }
}
