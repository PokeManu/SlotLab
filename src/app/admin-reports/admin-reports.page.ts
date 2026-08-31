import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
    barChartOutline,
    bulbOutline,
    businessOutline,
    calendarOutline,
    checkboxOutline,
    chevronDownOutline,
    constructOutline,
    gridOutline,
    imageOutline,
    locationOutline,
    personOutline,
    volumeHighOutline,
    warningOutline,
    wifiOutline
  } from 'ionicons/icons';

interface NavigationItem {
  label: string;
  icon: string;
  active: boolean;
  route: string;
}

type ReportPriority = 'high' | 'medium' | 'low';
type ReportStatus = 'open' | 'in-progress' | 'resolved';
type ReportFilter = 'all' | ReportStatus;

interface AdminReport{
  id: number;
  title: string;
  space: string;
  date: string;
  reporter: string;
  description: string;
  priority: ReportPriority;
  priorityLabel: string;
  status: ReportStatus;
  statusLabel: string;
  assignee: string;
  icon: string;
  attachment?:{
    name: string;
    size: string;
  }
}

@Component({
  selector: 'app-admin-reports',
  templateUrl: './admin-reports.page.html',
  styleUrls: ['./admin-reports.page.scss'],
  imports: [IonContent, IonIcon, RouterLink]
})
export class AdminReportsPage{
  readonly navigationItem: NavigationItem[] = [
    {
      label: 'Panoramica',
      icon: 'grid-outline',
      active: false,
      route: '/admin'
    },
    {
      label: 'Prenotazioni',
      icon: 'calendar-outline',
      active: false,
      route: '/admin/bookings'
    },
    {
      label: 'Spazi',
      icon: 'business-outline',
      active: false,
      route: '/admin/spaces'
    },
    {
      label: 'Segnalazioni',
      icon: 'construct-outline',
      active: true,
      route: '/admin/reports'
    },
    {
      label: 'Statistiche',
      icon: 'bar-chart-outline',
      active: false,
      route: '/admin/statistics'
    }
  ];

  readonly reports: AdminReport[] = [
    {
      id: 1,
      title: 'Proiettore non funzionante',
      space: 'Aula Studio A1',
      date: '22 Agosto 2026',
      reporter: 'Mario Rossi',
      description: 'Il proiettore non si accende e la spia di alimentazione lampeggia in rosso. Necessario intervento tecnico.',
      priority: 'high',
      priorityLabel: 'Alta',
      status: 'in-progress',
      statusLabel: 'In lavorazione',
      assignee: 'Ufficio tecnico',
      icon: 'warning-outline',
      attachment:{
        name: 'IMG_8921.jpg',
        size: '1.2 MB'
      }
    },
    {
      id: 2,
      title: 'Connessione Wi-Fi instabile',
      space: 'Laboratorio Web',
      date: '21 agosto 2026',
      reporter: 'Giulia Bianchi',
      description: 'La connessione Wi-Fi si interrompe frequentemente durante le attività del laboratorio.',
      priority: 'medium',
      priorityLabel: 'Media',
      status: 'open',
      statusLabel: 'Aperta',
      assignee: 'Ufficio tecnico',
      icon: 'wifi-outline'
    },
    {
      id: 3,
      title: 'Sedia rotta',
      space: 'Sala Riunioni B',
      date: '20 agosto 2026',
      reporter: 'Luca Romano',
      description: 'Una delle sedie vicine alla finestra presenta una gamba danneggiata.',
      priority: 'low',
      priorityLabel: 'Bassa',
      status: 'open',
      statusLabel: 'Aperta',
      assignee: 'Servizi generali',
      icon: 'construct-outline'
    },
    {
      id: 4,
      title: 'Luce lampeggiante',
      space: 'Aula Studio A3',
      date: '19 agosto 2026',
      reporter: 'Sara Conti',
      description: 'La plafoniera sopra la seconda fila di tavoli lampeggia continuamente.',
      priority: 'medium',
      priorityLabel: 'Media',
      status: 'in-progress',
      statusLabel: 'In lavorazione',
      assignee: 'Ufficio tecnico',
      icon: 'bulb-outline'
    },
    {
      id: 5,
      title: 'Rumore eccessivo',
      space: 'Laboratorio Web',
      date: '19 agosto 2026',
      reporter: 'Paolo Verdi',
      description: 'La ventola di una postazione produce un rumore molto forte durante l’utilizzo.',
      priority: 'low',
      priorityLabel: 'Bassa',
      status: 'open',
      statusLabel: 'Aperta',
      assignee: 'Ufficio tecnico',
      icon: 'volume-high-outline'
    }
  ];

  activeFilter: ReportFilter = 'all';
  selectedReport: AdminReport = this.reports[0];

  get filteredReports(): AdminReport[]{
    if(this.activeFilter === 'all'){
      return this.reports;
    }

    return this.reports.filter((report) => report.status === this.activeFilter);
  } 

  setFilter(filter: ReportFilter):void {
    this.activeFilter = filter;
  }

  selectReport(report: AdminReport): void {
    this.selectedReport = report;
  }
  constructor() {

         addIcons({
        barChartOutline,
        bulbOutline,
        businessOutline,
        calendarOutline,
        checkboxOutline,
        chevronDownOutline,
        constructOutline,
        gridOutline,
        imageOutline,
        locationOutline,
        personOutline,
        volumeHighOutline,
        warningOutline,
        wifiOutline
      });
   }

}
