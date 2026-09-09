# Verifica responsive — 9 settembre 2026

## Ambito

Controllo statico delle route e degli stili delle schermate:

- Login, registrazione, recupero password, cambio password, eliminazione account.
- Home, Spazi, Dettaglio spazio, Nuova prenotazione, Conferma, Prenotazioni, Dettaglio e partecipanti.
- Preferiti, Notifiche, creazione ed elenco Segnalazioni, Profilo, Check-in.
- Amministrazione: Panoramica, Spazi, Prenotazioni, Segnalazioni, Statistiche, Utenti, Edifici, Disponibilità, Avvisi.
- Componenti condivisi: sidebar, topbar, navigazione mobile, card, mappa, filtri e pannelli di dettaglio.

## Correzioni

- Form Edifici, Disponibilità e Spazi: colonne adattate alla larghezza disponibile; campi senza larghezza minima intrinseca che forza lo scorrimento.
- Righe Edifici, Disponibilità e Utenti: disposizione verticale già su tablet e testi lunghi a capo.
- Prenotazioni admin: colonne restringibili e dettaglio sotto l’elenco su tablet; filtri a larghezza disponibile. Lo scorrimento orizzontale resta contenuto nella tabella.
- Segnalazioni admin: eliminati i minimi rigidi delle colonne; dettaglio sotto l’elenco su tablet.
- Topbar utente su tablet: navigazione su una seconda riga, con spazio per l’account.
- Card prenotazioni su tablet: azioni su una riga dedicata. Su smartphone stretto i pulsanti possono andare a capo.
- Spazi su smartphone stretto: immagine sopra il testo; servizi del dettaglio su due colonne.
- Statistiche su smartphone stretto: date e righe degli indicatori su una colonna.
- Testi dinamici e campi nei contenuti principali possono restringersi o andare a capo.

## Esiti e limiti

Suite frontend completa: 128 test superati su 44 file. I test Angular non misurano la disposizione grafica reale.

Il browser disponibile apre il login e non ha una sessione autenticata. Non è stata effettuata una verifica visiva completa delle pagine riservate e non si certifica quindi l’assenza di problemi grafici su ogni dispositivo.

Per chiudere la verifica visiva, provare entrambe le utenze a larghezze 320, 375, 390, 768, 900, 1024, 1180 e 1440 pixel, con contenuti reali e nomi/email lunghi. Controllare assenza di scorrimento orizzontale della pagina, accessibilità dei pulsanti, menu, apertura dei calendari, moduli con tastiera e contenuti in fondo alla pagina. Le tabelle e i grafici che prevedono scorrimento interno devono restare consultabili.

Nessuna modifica al database o alla logica delle prenotazioni.
