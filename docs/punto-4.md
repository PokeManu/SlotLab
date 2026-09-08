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

## Aggiornamento 8 settembre — Avvisi globali

- Aggiunta la pagina admin `/admin/announcements`, raggiungibile da **Avvisi** nella navigazione condivisa, con titolo, messaggio, stato di invio ed esito con numero di destinatari.
- `POST /api/v1/admin/announcements` valida i campi e richiede un amministratore autenticato. Una transazione salva l'avviso e una notifica `global_announcement` per ogni account `user` esistente; esclusi admin e iscrizioni successive. In caso di errore viene annullata l'intera operazione.
- Il form blocca invii simultanei, aggiorna l'esito tramite signal e conserva il testo in caso di errore.
- Verifiche mirate: 1 test HTTP backend (ruoli, validazione, destinatari, persistenza, nessuna retroattività e rollback) e 12 test Angular (pagina e routing) superati. Database temporaneo dedicato, nessun invio ad account reali.
- Layout riprende griglia e sidebar amministrative esistenti; prova visiva desktop/mobile e build production non rieseguite in questo intervento. Questo aggiornamento non chiude tutte le verifiche del punto 4.
- Prova manuale: riavviare il backend, aprire **Avvisi** come admin, pubblicare titolo e messaggio di prova, poi accedere come utente già registrato e aprire **Notifiche**; controllare la permanenza dell'avviso dopo il ricaricamento.

## Aggiornamento 8 settembre — Esito del check-in

- La pagina `/check-in/:id` usa signal per caricamento, successo ed errore: la risposta HTTP aggiorna subito il template anche senza Zone.js.
- Ogni verifica elimina l'esito precedente; durante la richiesta sono bloccati gli invii simultanei. La sottoscrizione termina alla distruzione del componente.
- Pulsante con stile coerente, stato disabilitato e focus da tastiera visibile.
- Superati 13 test Angular mirati (3 check-in e 10 routing): successo, ripetizione, errore dopo successo, ID non valido e ritorno dopo login. HTTP simulato nei test frontend; nessuna presenza reale registrata. La lettura di un QR con fotocamera e la verifica integrata dell'orario sul backend restano prove separate.

## Correzione — Fasce aggiornate al rientro nella prenotazione

- La pagina Nuova prenotazione ricarica spazio e disponibilità a ogni rientro Ionic successivo alla prima apertura, eliminando la selezione della fascia precedente.
- Le richieste di disponibilità superate da un cambio data vengono annullate; errori di rete, caricamento ed elenco vuoto hanno messaggi distinti.
- Verifiche: 4 test Angular superati, incluso il rientro con un nuovo ID di fascia; 1 test HTTP su database temporaneo conferma che ritiro e ricreazione via API admin restituiscono soltanto la nuova fascia prenotabile nel catalogo utente. Nessuna modifica al database operativo. Verifica manuale da ripetere sul caso segnalato.

## Correzione — Prenotazioni amministrative reali

- Corretta la lettura asincrona del totale SQLite in `GET /admin/bookings`, che usava direttamente l'API callback come Promise. Aggiunto il nome dell'organizzatore alla risposta.
- Eliminati dati dimostrativi e selezione iniziale fittizia. La pagina legge tutte le pagine API, aggiorna il template e ricarica al rientro Ionic; gestisce caricamento, errore con riprova, elenco vuoto e selezione coerente con i filtri.
- Date dei filtri ricavate dalle prenotazioni; stato `completed` mostrato come Completata. Rimosse creazione/modifica e cancellazione simulata: l'admin gestisce le indisponibilità dalla pagina dedicata.
- Superati 4 test Angular e 1 test HTTP backend su database temporaneo, inclusi ruoli, totale, organizzatore, paginazione, dettaglio, rientro ed errore. Prova browser da ripetere dopo riavvio backend.

## Correzione — Check-in con più prenotazioni nello stesso spazio

- Il backend privilegia la partecipazione nella finestra di check-in corrente, invece di scegliere sempre la prenotazione più vecchia. In assenza di una fascia corrente considera la prima futura oppure l'ultima scaduta.
- Un'unica lettura dell'orario guida la selezione e la verifica. Il check-in ripetuto conserva l'orario originale della partecipazione selezionata.
- Test HTTP mirato superato su DB temporaneo: prenotazione corrente preceduta da una vecchia, precedente già presente, ripetizione, accesso anonimo/admin/estraneo, anticipo e scadenza. Nessuna presenza operativa modificata.
- Il QR della pagina di conferma contiene ancora grafica dimostrativa (`fake-qr`): generazione QR reale e prova tramite fotocamera restano da completare; non considerare il flusso QR verificato integralmente.

## Aggiornamento 8 settembre — Chiusura dei collegamenti rimasti simulati

Implementati localmente:

- QR reale dello spazio, nella conferma e nella gestione admin Spazi; usa `qrcode` 1.5.4 e apre `/check-in/{spaceId}` sullo stesso indirizzo dell'app. Nessun token o codice individuale nel QR. Riferimento libreria: https://github.com/soldair/node-qrcode.
- Conferma caricata dalla prenotazione persistita: spazio, edificio, piano, data, orario e numero effettivo di partecipanti. Rimossi i valori dimostrativi e la risorsa prenotabile non prevista.
- Dettaglio utente `/bookings/{id}` con elenco partecipanti, aggiunta tramite email, rimozione e abbandono. Il backend espone separatamente `participantId` e ID utente. Gestione riservata all'organizzatore, uscita consentita al partecipante; vincoli temporali e di capienza autorevoli sul server.
- Posti nella nuova prenotazione calcolati dalle email; chiave di idempotenza conservata in caso di retry degli stessi dati. Notifiche di creazione, aggiunta e rimozione salvate nella stessa transazione dell'operazione.
- Conteggio dei posti come massimo delle presenze prenotate contemporanee, incluse fasce ritirate. Nessun doppio conteggio di intervalli consecutivi. Rimosso il limite improprio di quattro invitati per gruppo; resta il limite di cinque prenotazioni per persona.
- Filtri admin Spazi e paginazione effettivi, modifica di edificio/stato/servizi, modifica edifici con coordinate e modifica fasce. Date e orari admin validati anche nel contenuto, non solo nella forma.
- Elenchi con filtri locali estesi alle pagine successive dell'API; criteri consigli Home limitati a oggi o, solo in assenza di risultati, domani. Distinta la semantica del solo filtro posti minimi da quella combinata con disponibili ora.
- Dettaglio prenotazioni admin con partecipanti/presenze. Completate mostrate nello storico admin e fasce terminate escluse dall'elenco utente.
- Cancellazione spazio/edificio/account admin con fotografie nella coda persistente, pulizia solo dopo commit e notifiche ai soli interessati. Riduzione capienza controllata anche sul totale dei gruppi sovrapposti. Il cambio stato spazio cancella le prenotazioni future senza cancellare quelle già iniziate.

Verifiche: 109/109 test Angular e 86/86 backend superati; build production superata fuori sandbox, con avvisi di budget/CommonJS (Leaflet e qrcode). I test backend usano database temporanei e non caricano `.env`. La pagina login è stata aperta nel browser integrato; non equivale al collaudo dei nuovi flussi autenticati.

### Chiusura ancora da attestare

Il punto 4 non è dichiarato definitivamente chiuso: manca il collaudo browser autenticato desktop/mobile dei nuovi controlli e del QR su un indirizzo raggiungibile dal telefono. `127.0.0.1` su un telefono identifica il telefono stesso, non il computer.

Resta inoltre da verificare sistematicamente la gestione delle occorrenze storiche prima dei cambi di disponibilità/capienza, prerequisito delle statistiche del punto 5: lo schema esiste, ma non dichiarare implementato il consolidamento periodico degli snapshot sulla base delle sole tabelle. Le statistiche non rientrano negli esiti di verifica di questo aggiornamento.
