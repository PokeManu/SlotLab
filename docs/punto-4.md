# Punto 4 — Flussi applicativi e amministrazione

## Stato

Implementazione locale sul branch `Backend`, non ancora committata o pubblicata.

## Backend implementato

- catalogo edifici e spazi, dettaglio e disponibilità;
- ricerca, accessibilità, disponibilità futura e posti minimi;
- consigli Home;
- prenotazioni con partecipanti, limite personale, sovrapposizioni, capienza e `Idempotency-Key`;
- elenco, dettaglio, cancellazione e check-in;
- preferiti;
- segnalazioni con categoria, priorità e allegato JPEG/PNG/WebP fino a 5 MB;
- notifiche interne e marcatura come lette;
- amministrazione di edifici, spazi, disponibilità e indisponibilità;
- consultazione e cancellazione controllata degli utenti normali;
- statistiche su occorrenze finalizzate, prenotazioni, presenze, check-in e tipologia di spazio.
- riepilogo amministrativo aggregato dal database (`/admin/summary`) per prenotazioni odierne, spazi totali/disponibili e segnalazioni aperte.
- seed locale idempotente del catalogo demo già presente nei dati frontend: Edifici 6 e 9, tre spazi, servizi e fasce feriali 08:00–20:00.

## Frontend collegato

Sono collegati Home, Spazi, dettaglio spazio, prenotazioni, conferma, check-in, preferiti, segnalazioni, notifiche e pagine admin per prenotazioni, segnalazioni, utenti, edifici, disponibilità e statistiche. La gestione spazi include creazione, modifica, cancellazione e ricerca; la dashboard inoltra la ricerca alla lista spazi.

## Verifiche

- suite backend: 77/77 superata fuori dalla sandbox;
- suite Angular: 76/76 superata;
- build production Angular superata; restano solo avvisi di budget per gli stili e l'uso CommonJS di Leaflet;
- controlli sintattici delle route backend superati;
- `git diff --check` superato.

## Da verificare

- prova browser desktop/mobile e build production fuori dalla sandbox;
- test backend mirati per le nuove route del punto 4 (incluso `/admin/summary`);
- eventuali azioni secondarie richieste dal layout definitivo;
- controllo finale dei dati seedati e dei periodi statistici.
