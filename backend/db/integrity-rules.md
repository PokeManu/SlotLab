# SlotLab — Regole di integrità e responsabilità

Questo documento conclude il punto 2.2. Separa i vincoli applicati direttamente da SQLite, i controlli che devono essere eseguiti dal backend Express e le operazioni che devono avvenire in una transazione.

Riferimenti:

- [schema SQLite](schema.sql)
- [schema relazionale](../../docs/relational-schema.md)
- [contratto API](../../docs/api-contract.md)

Non sono ancora implementati servizi, route o transazioni applicative. Le indicazioni relative al backend costituiscono la checklist per i passaggi successivi.

## Tre livelli di controllo

1. **SQLite** protegge la forma e i collegamenti dei dati anche se il codice del backend contiene un errore.
2. **Express** applica le regole che dipendono da utente autenticato, tempo corrente, conteggi o confronti tra più righe.
3. **Transazione** mantiene coerenti le operazioni composte: o vengono completate tutte, oppure non ne rimane nessuna.

Il frontend può aiutare l'utente a inserire dati corretti, ma non è considerato una protezione: il server deve ricontrollare ogni richiesta.

## Vincoli garantiti direttamente da SQLite

### Struttura e valori elementari

- Tutte le tabelle hanno una chiave primaria intera con `AUTOINCREMENT`.
- I campi obbligatori usano `NOT NULL`.
- Nomi, descrizioni, titoli, messaggi e hash non possono essere stringhe vuote.
- Capienza e numero ufficiale dell'edificio devono essere maggiori di zero.
- Latitudine e longitudine rispettano i rispettivi intervalli numerici.
- I booleani sono memorizzati come `INTEGER` e accettano soltanto `0` o `1`.
- Giorni della settimana, date e orari rispettano il formato strutturale stabilito.
- L'orario finale deve essere successivo a quello iniziale nella stessa giornata.
- Ruoli, stati, tipologie, categorie, priorità e codici dei servizi accettano soltanto i valori concordati.

SQLite controlla la forma `YYYY-MM-DD` e `HH:mm`; la validità reale del calendario, per esempio l'esclusione del 31 febbraio, rimane responsabilità del server.

### Unicità

SQLite impedisce direttamente:

- due edifici con lo stesso numero ufficiale;
- due account con la stessa email normalizzata;
- due servizi con lo stesso codice;
- lo stesso servizio associato due volte allo stesso spazio;
- lo stesso preferito salvato due volte dallo stesso utente;
- la stessa persona inserita due volte nella medesima prenotazione;
- due notifiche dello stesso avviso globale per lo stesso destinatario;
- più di una sessione attiva per account;
- il riutilizzo della stessa `Idempotency-Key` da parte dello stesso account;
- due snapshot della stessa combinazione spazio, data e orario;
- due configurazioni attive perfettamente identiche;
- due organizzatori nella stessa prenotazione.

L'indice sull'organizzatore garantisce **al massimo uno**. La presenza di **almeno uno** richiede la transazione di creazione gestita dal backend.

### Coerenza tra campi

Il database garantisce inoltre che:

- una prenotazione usi una disponibilità appartenente allo stesso spazio;
- `present = 1` abbia un valore `checked_in_at` e `present = 0` non lo abbia;
- categoria e priorità della segnalazione rispettino la corrispondenza automatica;
- `updated_at` della segnalazione non preceda `created_at`;
- uno snapshot non consolidato non contenga risultati storici;
- uno snapshot consolidato e offerto abbia capienza positiva;
- uno snapshot escluso per indisponibilità abbia capienza offerta pari a zero.

### Chiavi esterne e cancellazioni

Le chiavi esterne impediscono riferimenti a righe inesistenti. Le principali azioni configurate sono:

| Relazione | Azione SQLite |
|---|---|
| Edificio → spazi | `ON DELETE CASCADE` |
| Spazio → disponibilità, indisponibilità e snapshot | `ON DELETE CASCADE` |
| Spazio → prenotazioni, preferiti, segnalazioni e servizi associati | `ON DELETE CASCADE` |
| Prenotazione → partecipazioni | `ON DELETE CASCADE` |
| Prenotazione → richiesta idempotente | `ON DELETE SET NULL` |
| Account → partecipazioni, preferiti, segnalazioni, notifiche e dati tecnici | `ON DELETE CASCADE` |
| Servizio ancora associato a uno spazio | `ON DELETE RESTRICT` |
| Amministratore autore di un avviso | `ON DELETE RESTRICT` |

Le cancellazioni a cascata del database rimuovono le righe dipendenti, ma non generano notifiche e non eliminano fotografie dal filesystem. Queste operazioni devono essere coordinate dal backend.

## Controlli obbligatori nel backend Express

### Autenticazione e autorizzazione

Il server deve:

- convalidare completamente il formato dell'email e normalizzarla prima dell'inserimento;
- verificare le regole della password e conservare soltanto il relativo hash;
- assegnare sempre `user` nella registrazione pubblica;
- impedire la creazione pubblica di amministratori;
- verificare ruolo e proprietà della risorsa per ogni endpoint;
- impedire agli amministratori di prenotare come utenti normali;
- confrontare il `jti` del JWT con la sessione corrente;
- ruotare refresh token e `jti` e applicare le scadenze concordate.

Il database conosce il valore di `users.role`, ma una normale chiave esterna non può imporre che un partecipante sia un utente normale o che l'autore di un avviso sia un amministratore. Il controllo rimane nel servizio applicativo.

### Edifici, spazi e fasce

Il server deve:

- convalidare date reali, fuso `Europe/Rome` e timestamp UTC;
- verificare le sovrapposizioni parziali tra configurazioni di disponibilità;
- consentire fasce consecutive ma rifiutare quelle sovrapposte;
- ritirare una vecchia configurazione invece di modificarla quando serve allo storico;
- controllare le prenotazioni prima di ridurre la capienza;
- applicare indisponibilità, cancellazioni e notifiche correlate;
- generare le occorrenze delle fasce e consolidarne lo snapshot all'inizio;
- evitare che una configurazione ritirata produca nuove fasce prenotabili.

L'indice SQLite blocca soltanto duplicati esatti delle disponibilità. Stabilire se due periodi ricorrenti generano una sovrapposizione effettiva richiede calcoli sulle date e deve essere fatto dal backend.

### Prenotazioni e partecipanti

Prima di creare o modificare una prenotazione, il server deve verificare:

- spazio attivo e fascia effettivamente prenotabile;
- data compresa nei successivi 30 giorni;
- anticipo minimo di un'ora;
- capienza residua nell'intero intervallo;
- massimo cinque prenotazioni future per ciascun partecipante;
- assenza di sovrapposizioni personali;
- esistenza delle email dei partecipanti e ruolo `user` degli account;
- presenza esattamente di un organizzatore;
- corrispondenza tra `Idempotency-Key` e impronta della richiesta;
- permessi dell'organizzatore per aggiunte, rimozioni e cancellazione;
- permesso del partecipante di abbandonare la prenotazione.

Il conteggio dei posti, il limite di cinque e le sovrapposizioni cambiano nel tempo e dipendono da più righe. Non possono essere rappresentati correttamente con un semplice `CHECK` SQLite.

### Check-in

Il server deve verificare insieme:

- identità dell'utente autenticato;
- partecipazione alla prenotazione;
- corrispondenza con lo spazio indicato dal QR;
- finestra da 15 minuti prima a 30 minuti dopo l'inizio;
- eventuale check-in già eseguito, conservando il primo orario.

SQLite garantisce soltanto la coerenza finale tra `present` e `checked_in_at`.

### Segnalazioni, notifiche e statistiche

Il server deve:

- controllare formato reale, contenuto e limite di 5 MB della fotografia;
- generare il nome del file senza fidarsi di quello ricevuto;
- impedire modifiche o cancellazioni delle segnalazioni da parte dell'utente;
- impedire la riapertura di una segnalazione risolta;
- generare notifiche personali per gli eventi previsti;
- escludere amministratori e iscritti successivi dagli avvisi globali;
- applicare i criteri temporali di `availableNow`, `minSeats` e consigli della Home;
- calcolare le statistiche usando soltanto snapshot terminati e offerti.

## Operazioni che richiedono una transazione

| Operazione | Dati da modificare atomicamente |
|---|---|
| Creazione prenotazione | Controlli finali, prenotazione, organizzatore, partecipanti e `booking_requests` |
| Aggiunta o rimozione partecipante | Controlli di capienza, limite e sovrapposizione insieme alla partecipazione |
| Cancellazione prenotazione | Prenotazione, partecipazioni, aggiornamento idempotenza e notifiche |
| Nuova indisponibilità o cambio stato spazio | Configurazione, prenotazioni future coinvolte e notifiche |
| Riduzione capienza | Verifica delle fasce future o in corso e aggiornamento della capienza |
| Modifica disponibilità | Ritiro della vecchia configurazione, nuova versione, prenotazioni invalidate e notifiche |
| Eliminazione account | Prenotazioni organizzate, partecipazioni, dati personali, sessione e notifiche agli altri utenti |
| Eliminazione spazio o edificio | Tutte le righe dipendenti e notifiche per le prenotazioni future |
| Login o rinnovo | Sostituzione della sessione, refresh token e `jti` |
| Cambio o recupero password | Nuovo hash ed eliminazione della sessione corrente |
| Check-in | Verifica dello stato e registrazione unica di presenza e primo orario |
| Avviso globale | Avviso e notifiche per tutti gli utenti normali presenti in quel momento |
| Consolidamento fascia | `offered_capacity`, `was_offered` e `finalized_at` dello stesso snapshot |

Per la creazione di una prenotazione SQLite dovrà serializzare il controllo della capienza e la scrittura, per esempio iniziando una transazione di scrittura prima di leggere i posti residui. La modalità concreta sarà scelta durante l'implementazione del servizio.

## Limite delle transazioni sulle fotografie

La transazione SQLite può annullare modifiche alle righe, ma non può ripristinare automaticamente un file eliminato dal disco. Il backend dovrà quindi coordinare le due operazioni, registrare eventuali errori e prevedere una pulizia compensativa. Non viene promessa atomicità completa tra database e filesystem.

## Esito del punto 2.2

Lo schema SQLite protegge i vincoli strutturali e locali. Le regole dipendenti da tempo, ruolo, conteggi o più entità sono assegnate esplicitamente al backend, e le operazioni composte sono identificate come transazionali.

Il punto 2.2 non modifica il database reale e non implementa ancora questi controlli: fornisce la mappa da seguire durante l'organizzazione e lo sviluppo di Express.
