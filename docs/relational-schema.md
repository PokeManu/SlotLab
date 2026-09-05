# SlotLab — Schema relazionale

Documento costruito progressivamente con la revisione degli studenti. Descrive il modello logico; non è uno script SQL e non modifica il database.

La proposta è già stata inviata. Su richiesta dell'utente, mantenere il più possibile struttura e funzionalità dichiarate: limitare gli adattamenti ai dettagli tecnici necessari, esplicitarli e sottoporre eventuali cambiamenti funzionali alla revisione. Non modificare la proposta o le tavole inviate.

## Stato della revisione

| Tavola | Contenuto | Stato |
|---|---|---|
| 1 | Edifici, spazi e servizi | Approvata dall'utente |
| 2 | Disponibilità e indisponibilità | Approvata dall'utente |
| 3 | Account, prenotazioni e partecipazione | Struttura e vincoli logici approvati; traduzione SQL completata |
| 4 | Preferiti e segnalazioni | Struttura di favorites e reports approvata |
| 5 | Avvisi globali e notifiche | Struttura di announcements e notifications approvata |

Riferimenti: le cinque immagini in `../../Schema E:R/`, la proposta finale in `../../Proposta SlotLab/` e [il contratto API](api-contract.md).

I nomi delle colonne del database usano `snake_case`; le proprietà JSON dell'API rimangono in `camelCase`. PK indica la chiave primaria; FK indica una chiave esterna. I tipi sotto riportati sono logici. La traduzione fisica per un database SQLite vuoto è stata completata nel punto 2.1 ed è disponibile in [`backend/db/schema.sql`](../backend/db/schema.sql). Express è collegato al sistema di migrazione e alla connessione condivisa; il database operativo non viene invece creato finché non si esegue il backend o uno dei comandi espliciti. La divisione delle responsabilità tra SQLite, backend e transazioni è documentata in [`backend/db/integrity-rules.md`](../backend/db/integrity-rules.md).

## Tavola 1 — Edifici, spazi e servizi

### buildings

Tutti i campi sono obbligatori.

| Campo | Tipo logico | Significato e vincoli approvati |
|---|---|---|
| id | Intero | PK progressiva, non riutilizzata |
| number | Intero | Numero ufficiale UniPa, obbligatorio e univoco |
| name | Testo | Nome dell'edificio, obbligatorio |
| address | Testo | Indirizzo, obbligatorio |
| latitude | Decimale | Latitudine compresa tra -90 e 90 |
| longitude | Decimale | Longitudine compresa tra -180 e 180 |

`id` è l'identificativo tecnico; `number` rappresenta la numerazione ufficiale dell'edificio. L'attributo Identificativo della tavola corrisponde a `number`. Il campo `name`, non rappresentato separatamente nella tavola, è previsto nel contratto API ed è stato accettato nella revisione.

### spaces

Tutti i campi sono obbligatori.

| Campo | Tipo logico | Significato e vincoli approvati |
|---|---|---|
| id | Intero | PK progressiva, non riutilizzata |
| building_id | Intero | FK obbligatoria verso buildings.id |
| name | Testo | Nome dello spazio, obbligatorio |
| floor | Intero | Piano, anche negativo per rappresentare un interrato |
| type | Testo | study_room, laboratory oppure meeting_room |
| capacity | Intero | Capienza maggiore di zero |
| accessible | Booleano | Accessibilità fisica dello spazio |
| status | Testo | active, maintenance oppure deactivated |

La relazione Contiene è rappresentata da `spaces.building_id`: ogni edificio contiene zero o più spazi; ogni spazio appartiene esattamente a un edificio. Non occorre una tabella separata per questa relazione.

### services

Tutti i campi sono obbligatori.

| Campo | Tipo logico | Significato e vincoli approvati |
|---|---|---|
| id | Intero | PK progressiva, non riutilizzata |
| code | Testo | Codice tecnico univoco |
| name | Testo | Etichetta visualizzata |

Catalogo fisso concordato: `wifi`, `power_outlets`, `projector`, `computer`, `air_conditioning`. `code` collega i valori tecnici delle API alle etichette visualizzate. I servizi descrivono gli spazi e non sono prenotabili separatamente.

### space_services

Tutti i campi sono obbligatori.

| Campo | Tipo logico | Significato e vincoli approvati |
|---|---|---|
| id | Intero | PK progressiva, non riutilizzata |
| space_id | Intero | FK obbligatoria verso spaces.id |
| service_id | Intero | FK obbligatoria verso services.id |

Vincolo UNIQUE sulla coppia `(space_id, service_id)`: lo stesso servizio non può essere associato due volte allo stesso spazio.

Questa tabella traduce la relazione molti-a-molti Ha. Uno spazio può avere zero o più servizi e ciascun servizio può appartenere a zero o più spazi. Eliminando uno spazio si eliminano le relative righe di `space_services`; il catalogo `services` rimane.

### Attributi ricavati

- QR Code: generato dall'URL di check-in contenente `spaces.id`, senza colonna separata né identificativo casuale aggiuntivo.
- Immagine standard: ricavata da `spaces.type`; `imageType` può essere restituito dall'API senza essere una colonna indipendente.

### Note per la definizione fisica nel punto 2

Le cancellazioni verso prenotazioni, segnalazioni, preferiti e disponibilità sono riepilogate nella sezione Vincoli tra i dati. Tipi SQLite e vincoli di integrità sono definiti in `schema.sql`. Non sono stati introdotti limiti massimi arbitrari per i testi non stabiliti nel contratto; gli indici dedicati alle prestazioni saranno valutati nei passaggi successivi senza modificare le cardinalità e le regole logiche qui approvate.

## Tavola 2 — Disponibilità e indisponibilità

### availabilities

Ogni riga descrive una fascia settimanale ricorrente, appartenente a uno spazio e valida in un periodo determinato. Tutti i campi sono obbligatori.

| Campo | Tipo logico | Significato e vincoli approvati |
|---|---|---|
| id | Intero | PK progressiva, non riutilizzata |
| space_id | Intero | FK obbligatoria verso spaces.id |
| valid_from | Data | Primo giorno di validità, incluso |
| valid_until | Data | Ultimo giorno di validità, incluso; non precedente a valid_from |
| weekday | Intero | Da 1 (lunedì) a 7 (domenica) |
| start_time | Orario | Inizio della fascia |
| end_time | Orario | Fine successiva all'inizio, nella stessa giornata |
| is_retired | Booleano | Obbligatorio; inizialmente false; true per configurazioni ritirate |

La relazione Offre è rappresentata da `space_id`: uno spazio offre zero o più disponibilità e ciascuna disponibilità appartiene esattamente a uno spazio.

Esempio: una riga può rappresentare ogni lunedì dalle 10:00 alle 12:00, dal 1° settembre al 31 dicembre. Per il martedì occorre una riga distinta. Le fasce consecutive, come 10:00–12:00 e 12:00–14:00, sono distinte.

Date e orari della configurazione sono interpretati nel fuso `Europe/Rome`, come previsto dal contratto API.

is_retired è un'aggiunta tecnica approvata per attuare la conservazione delle vecchie configurazioni. Con false la configurazione può essere usata per nuove prenotazioni, rispettando periodo di validità e tutti gli altri controlli. Con true non viene più proposta per nuove prenotazioni, ma rimane leggibile dalle prenotazioni già collegate.

Il campo non modifica da solo le prenotazioni esistenti. Quelle future invalidate dalla modifica vengono cancellate e gli utenti notificati secondo le regole concordate; gli orari delle prenotazioni storiche restano quelli della configurazione originale.

### unavailabilities

Ogni riga descrive un'eccezione riferita a una data precisa. Tutti i campi sono obbligatori.

| Campo | Tipo logico | Significato e vincoli approvati |
|---|---|---|
| id | Intero | PK progressiva, non riutilizzata |
| space_id | Intero | FK obbligatoria verso spaces.id |
| date | Data | Giorno dell'indisponibilità |
| start_time | Orario | Inizio dell'indisponibilità |
| end_time | Orario | Fine successiva all'inizio, nella stessa giornata |
| reason | Testo | Motivazione visibile soltanto agli amministratori |

La relazione Subisce è rappresentata da `space_id`: uno spazio può subire zero o più indisponibilità e ciascuna indisponibilità riguarda esattamente uno spazio.

Esempio: una chiusura il 14 settembre dalle 09:00 alle 13:00 rende non disponibile anche la fascia ordinaria 10:00–12:00. Le prenotazioni future interessate sono cancellate e gli utenti notificati secondo le regole già concordate.

### slot_occurrences — Soluzione tecnica per le statistiche storiche

Questa tabella tecnica materializza le singole occorrenze delle fasce, comprese quelle che non ricevono prenotazioni. Non introduce una nuova funzionalità per l'utente: conserva i dati minimi approvati per calcolare le statistiche dei periodi passati senza applicare retroattivamente capienze o indisponibilità successive.

| Campo | Tipo logico | Significato e vincoli approvati |
|---|---|---|
| id | Intero | PK progressiva, non riutilizzata |
| space_id | Intero | FK obbligatoria verso spaces.id |
| date | Data | Giorno concreto dell'occorrenza |
| start_time | Orario | Inizio della fascia in Europe/Rome |
| end_time | Orario | Fine della fascia, successiva all'inizio |
| offered_capacity | Intero | Posti effettivamente offerti; NULL finché l'occorrenza non è consolidata, zero se esclusa per indisponibilità |
| was_offered | Booleano | NULL finché non consolidata; true se la fascia era effettivamente offerta, false se era indisponibile |
| finalized_at | Data e ora | NULL prima del consolidamento; momento UTC in cui lo snapshot diventa definitivo |

Vincolo UNIQUE sulla combinazione `(space_id, date, start_time, end_time)`: una stessa fascia concreta dello spazio viene conteggiata una sola volta anche quando la configurazione ricorrente viene sostituita o ritirata.

Le occorrenze vengono preparate dalle configurazioni di disponibilità e consolidate all'inizio della fascia. In quel momento il backend registra atomicamente la capienza valida e se un'indisponibilità sovrapposta impediva di offrire la fascia. Dopo il consolidamento questi valori non vengono ricalcolati in seguito a modifiche amministrative. Se una modifica di capienza o indisponibilità riguarda una fascia già iniziata e lo snapshot non è ancora stato prodotto, il backend lo consolida prima della modifica.

Le righe con `was_offered = true` partecipano al denominatore dei posti offerti quando la fascia è terminata; quelle con `was_offered = false` documentano l'esclusione ma non contribuiscono al calcolo. Le occorrenze senza prenotazioni rimangono quindi conteggiabili. Le righe future non consolidate possono essere aggiornate o rigenerate quando cambiano configurazione, capienza o indisponibilità.

La tabella non contiene account, partecipanti o altri dati personali. L'eliminazione definitiva dello spazio elimina anche le sue occorrenze, coerentemente con le cancellazioni già approvate; le statistiche non promettono quindi uno storico immutabile dopo l'eliminazione dello spazio o dell'edificio.

### Note per la definizione fisica nel punto 2

La conservazione delle disponibilità referenziate è descritta nella Tavola 3 e utilizza il campo approvato is_retired. I controlli approvati su duplicazioni e sovrapposizioni delle configurazioni sono descritti nella sezione Vincoli tra i dati. I tipi e i vincoli SQL fisici di `slot_occurrences` sono definiti in `schema.sql`; la generazione e il consolidamento delle occorrenze saranno implementati nei successivi passaggi del backend.

## Tavola 3 — Account, prenotazioni e partecipazione

### users

Traduce l'entità Account della tavola. Tutti i campi sono obbligatori.

| Campo | Tipo logico | Significato e vincoli approvati |
|---|---|---|
| id | Intero | PK progressiva, non riutilizzata |
| first_name | Testo | Nome |
| last_name | Testo | Cognome |
| email | Testo | Email univoca, normalizzata in minuscolo e senza spazi esterni |
| password_hash | Testo | Hash della password, mai la password leggibile |
| role | Testo | user oppure admin |
| created_at | Data e ora | Assegnata dal server e registrata in UTC |

Utenti normali e amministratori sono nella stessa tabella. La registrazione pubblica assegna sempre `user`; gli account `admin` vengono creati esclusivamente da chi gestisce tecnicamente il sistema.

I limiti concordati di 8–64 caratteri riguardano la password inserita, non la lunghezza del suo hash. Non sono previsti campi per verifica email o blocco dell'account. I dati delle sessioni sono definiti separatamente nella tabella tecnica `auth_sessions`.

### Conservazione delle configurazioni di disponibilità — Approvata

Quando una configurazione serve a prenotazioni storiche, la sua modifica non deve alterare retroattivamente la fascia delle prenotazioni completate. La vecchia configurazione viene conservata e resa non utilizzabile per nuove prenotazioni; la nuova configurazione ha una riga distinta.

Se una configurazione eliminata dall'amministratore serve allo storico, la riga rimane come riferimento ma non viene più offerta per nuove prenotazioni. Le prenotazioni future invalidate dalla modifica vengono cancellate e gli utenti notificati, secondo la proposta. La gestione delle prenotazioni future non invalidate deve conservarne i riferimenti senza cambiarne spazio, data o orari.

Questa conservazione riguarda le configurazioni di disponibilità. Non modifica la cancellazione definitiva già concordata di account, spazi ed edifici e dei relativi dati. Il campo tecnico approvato per distinguere una configurazione ritirata è availabilities.is_retired.

### bookings

Traduce l'entità Prenotazione e le relazioni Riguarda e Usa della Tavola 3. Tutti i campi sono obbligatori.

| Campo | Tipo logico | Significato e vincoli approvati |
|---|---|---|
| id | Intero | PK progressiva, non riutilizzata |
| space_id | Intero | FK verso spaces.id; traduce Riguarda |
| availability_id | Intero | FK verso availabilities.id; traduce Usa |
| date | Data | Giorno effettivo della prenotazione |
| status | Testo | confirmed oppure completed |
| created_at | Data e ora | Momento della creazione, assegnato dal server in UTC |

Il server verifica che la disponibilità scelta appartenga allo spazio indicato. La data identifica l'occorrenza concreta della regola settimanale, per esempio il 14 settembre per una disponibilità del lunedì.

Gli orari sono ricavati dalla configurazione collegata, preservata secondo la politica approvata di conservazione delle configurazioni storiche. Organizzatore, altri partecipanti e presenze sono rappresentati nella partecipazione. Il numero dei posti prenotati si ricava contando le persone associate.

### booking_participants

Traduce la relazione Partecipa e i relativi attributi della Tavola 3. Ogni riga rappresenta una persona associata a una prenotazione, compreso l'organizzatore.

| Campo | Tipo logico | Significato e vincoli approvati |
|---|---|---|
| id | Intero | PK progressiva, non riutilizzata |
| booking_id | Intero | FK obbligatoria verso bookings.id |
| user_id | Intero | FK obbligatoria verso users.id |
| participant_role | Testo | Obbligatorio: organizer oppure participant |
| present | Booleano | Obbligatorio; inizialmente false |
| checked_in_at | Data e ora | Inizialmente NULL; primo check-in valido registrato in UTC |

Vincolo UNIQUE sulla coppia `(booking_id, user_id)`: la stessa persona non può comparire due volte nella medesima prenotazione. Ogni prenotazione deve avere esattamente un organizzatore, che occupa un posto. Sono ammessi soltanto account con `users.role = user`.

`participant_role` descrive il ruolo nella singola prenotazione ed è distinto da `users.role`, che distingue gli utenti normali dagli amministratori.

Un check-in valido imposta insieme `present = true` e `checked_in_at`. Un tentativo ripetuto conserva il primo orario. Prima della scadenza della finestra di check-in, `present = false` indica che il check-in non è ancora avvenuto; dopo la scadenza rappresenta l'assenza.

### Note attuative per il punto 2

La struttura di users, bookings e booking_participants e la conservazione delle configurazioni storiche sono approvate. Nel punto 2 i vincoli tra tabelle e le operazioni transazionali dovranno attuare queste regole, compreso il mantenimento di esattamente un organizzatore.

## Tavola 4 — Preferiti e segnalazioni

### favorites

Traduce la relazione Salva tra Account e Spazio. Tutti i campi sono obbligatori.

| Campo | Tipo logico | Significato e vincoli approvati |
|---|---|---|
| id | Intero | PK progressiva, non riutilizzata |
| user_id | Intero | FK verso users.id; utente che salva il preferito |
| space_id | Intero | FK verso spaces.id; spazio salvato |
| created_at | Data e ora | Momento dell'aggiunta, assegnato dal server in UTC; corrisponde a DataInserimento |

Vincolo UNIQUE sulla coppia `(user_id, space_id)`: lo stesso utente non può salvare due volte lo stesso spazio. Utenti diversi possono salvare lo stesso spazio.

Nome, capienza e stato sono letti da spaces tramite space_id e non duplicati in favorites. Possono essere salvati anche spazi pieni, in manutenzione o disattivati.

Rimuovere un preferito elimina soltanto il collegamento. L'eliminazione definitiva di un account o di uno spazio elimina anche i relativi preferiti.

### reports

Traduce l'entità Segnalazione e le relazioni Invia e Riguarda della Tavola 4. Tutti i campi sono obbligatori tranne photo_path.

| Campo | Tipo logico | Significato e vincoli approvati |
|---|---|---|
| id | Intero | PK progressiva, non riutilizzata |
| user_id | Intero | FK verso users.id; autore della segnalazione |
| space_id | Intero | FK verso spaces.id; spazio segnalato |
| category | Testo | technical, accessibility, cleaning oppure other |
| description | Testo | Descrizione del problema |
| priority | Testo | high, medium oppure low; assegnata dal server |
| status | Testo | open, in_progress oppure resolved |
| photo_path | Testo | Riferimento al file della fotografia; NULL se assente |
| created_at | Data e ora | Momento dell'invio, assegnato dal server in UTC |
| updated_at | Data e ora | Ultimo aggiornamento dello stato, in UTC; alla creazione coincide con created_at |

user_id traduce Invia: ogni segnalazione ha un autore. space_id traduce Riguarda: ogni segnalazione riguarda uno spazio.

La fotografia, assente dagli attributi disegnati ma già prevista dalla proposta inviata, è conservata in una cartella gestita dal backend. photo_path ne contiene soltanto il riferimento; il nome del file viene generato dal server. È ammessa al massimo una fotografia JPEG, PNG o WebP di massimo 5 MB, con controllo del contenuto effettivo secondo il contratto API.

Priorità automatica: technical e accessibility corrispondono a high, cleaning a medium, other a low. Lo stato iniziale è open. L'utente non modifica o cancella la segnalazione dopo l'invio; gli amministratori modificano soltanto lo stato e resolved è definitivo.

Non sono previsti assegnatario, risposte o registrazione dell'amministratore che modifica lo stato. L'eliminazione a cascata per cancellazione dell'account o dello spazio deve rimuovere anche l'eventuale file della fotografia; il coordinamento tra database e filesystem sarà definito nell'attuazione tecnica.

## Tavola 5 — Avvisi globali e notifiche

### announcements

Traduce l'entità Avviso_Globale e la relazione Pubblica. Tutti i campi sono obbligatori.

| Campo | Tipo logico | Significato e vincoli approvati |
|---|---|---|
| id | Intero | PK progressiva, non riutilizzata |
| author_id | Intero | FK verso users.id; amministratore che pubblica l'avviso |
| title | Testo | Titolo della comunicazione |
| message | Testo | Contenuto della comunicazione |
| created_at | Data e ora | Momento della pubblicazione, assegnato dal server in UTC |

author_id traduce Pubblica. Il server ricava l'autore dalla sessione autenticata e verifica che abbia ruolo admin.

Un avviso è memorizzato una sola volta in announcements. La pubblicazione genera una notifica personale per ciascun utente normale esistente in quel momento. Lo stato di lettura appartiene alla notifica personale.

Gli avvisi sono esclusivamente globali: nessuna notifica agli amministratori e nessuna consegna retroattiva agli utenti registrati successivamente.

### notifications

Traduce l'entità Notifica e le relazioni Riceve e Genera. Tutti i campi sono obbligatori tranne announcement_id e read_at.

| Campo | Tipo logico | Significato e vincoli approvati |
|---|---|---|
| id | Intero | PK progressiva, non riutilizzata |
| user_id | Intero | FK verso users.id; utente destinatario |
| announcement_id | Intero | FK verso announcements.id; NULL per notifiche automatiche |
| type | Testo | Tipo di evento, per esempio booking_cancelled o global_announcement |
| title | Testo | Titolo della notifica |
| message | Testo | Contenuto della notifica |
| created_at | Data e ora | Momento della creazione, in UTC |
| read_at | Data e ora | Prima lettura, in UTC; NULL se non letta |

user_id traduce Riceve: ogni notifica ha un destinatario. announcement_id traduce Genera: una notifica può derivare da un avviso globale. Una notifica automatica, per esempio per la cancellazione di una prenotazione, non richiede un avviso globale.

L'attributo Letta della tavola è ricavato da read_at: NULL significa non letta, una data presente significa letta. L'API può esporre isRead come booleano derivato. Questo adattamento conserva la prima data di lettura prevista dal contratto senza duplicare lo stato. Segnare nuovamente come letta non cambia il primo orario.

La coppia `(user_id, announcement_id)` deve essere univoca quando announcement_id è presente. Lo stesso utente non riceve due volte lo stesso avviso globale; può ricevere più notifiche automatiche con announcement_id nullo.

Le notifiche non sono eliminabili manualmente e vengono rimosse con la cancellazione dell'account destinatario.

## Tabelle tecniche

### auth_sessions — Approvata

Rappresenta i dati necessari all'autenticazione tramite token e alla sessione unica per account già concordate. Tutti i campi sono obbligatori.

| Campo | Tipo logico | Significato e vincoli approvati |
|---|---|---|
| id | Intero | PK progressiva, non riutilizzata |
| user_id | Intero | FK verso users.id; univoco, al massimo una sessione per account |
| refresh_token_hash | Testo | Hash del refresh token corrente |
| access_token_jti | Testo | Identificativo dell'access token corrente |
| refresh_expires_at | Data e ora | Scadenza del refresh token, in UTC |
| created_at | Data e ora | Momento del login che ha creato la sessione, in UTC |

Il login crea una nuova sessione sostituendo quella eventualmente presente. Per ogni richiesta autenticata il server verifica il token e confronta il suo jti con access_token_jti della sessione corrente dell'account.

Il rinnovo sostituisce il refresh token e l'identificativo dell'access token; i precedenti non sono più accettati. Logout e cambio password eliminano la sessione e rendono inutilizzabili i token associati. Il recupero password invalida ugualmente i token, come già previsto dal contratto.

Il controllo del jti consente di invalidare immediatamente anche gli access token non ancora scaduti. La tabella non conserva password né refresh token leggibili. Restano valide le durate concordate: access token di 30 minuti e refresh token di 7 giorni.

### booking_requests — Approvata

Registra le richieste di creazione completate con successo per attuare la protezione dai doppi invii prevista dall'Idempotency-Key del contratto API.

| Campo | Tipo logico | Significato e vincoli approvati |
|---|---|---|
| id | Intero | PK progressiva, non riutilizzata |
| user_id | Intero | FK obbligatoria verso users.id; account che ha inviato la richiesta |
| idempotency_key | Testo | Codice obbligatorio della richiesta, riutilizzato nei tentativi dello stesso invio |
| request_hash | Testo | Impronta obbligatoria dei dati della richiesta |
| booking_id | Intero | FK verso bookings.id; valorizzata alla creazione, diventa NULL se la prenotazione viene eliminata |
| created_at | Data e ora | Momento della registrazione, obbligatorio e in UTC |

Vincolo UNIQUE sulla coppia `(user_id, idempotency_key)`. La stessa chiave con gli stessi dati identifica la prenotazione già creata, senza crearne un'altra. La stessa chiave con dati diversi restituisce un conflitto: una nuova operazione deve usare una nuova chiave.

Prenotazione e registrazione della richiesta sono salvate nella stessa transazione. Se la creazione fallisce non rimane una registrazione di successo. Anche richieste simultanee con la stessa chiave devono produrre una sola prenotazione.

Eliminando la prenotazione, la registrazione tecnica rimane con booking_id = NULL. Un successivo tentativo della vecchia richiesta restituisce un conflitto e non ricrea la prenotazione cancellata. Una nuova prenotazione intenzionale usa una nuova chiave e passa tutti i controlli ordinari.

Esempio approvato: ABC crea la prenotazione 48; dopo la cancellazione di 48, ABC rimane registrata senza collegamento. Ripetere ABC non ricrea 48. Per prenotare nuovamente si usa una nuova richiesta, per esempio DEF.

Le registrazioni tecniche sono eliminate con l'account. Non conservano il contenuto completo della prenotazione cancellata: resta l'impronta della richiesta, non una copia del suo corpo JSON.

## Vincoli tra i dati

### Fasce utilizzabili senza sovrapposizioni — Approvato

Uno stesso spazio non può offrire due configurazioni non ritirate le cui fasce si sovrappongono in una stessa data effettiva. Il controllo considera space_id, weekday, intervallo di validità e orari. Una duplicazione della stessa fascia è ugualmente vietata. Periodi di validità che non condividono alcuna occorrenza del giorno della settimana non creano una sovrapposizione.

- 10:00–12:00 e 12:00–14:00 nello stesso giorno sono consentite: il solo estremo in comune non è una sovrapposizione.
- 10:00–12:00 e 11:00–13:00 nello stesso giorno non sono consentite.
- La stessa fascia inserita due volte per lo stesso spazio e per date comuni non è consentita.
- Fasce sovrapposte negli orari ma valide rispettivamente solo a settembre e solo a ottobre sono consentite.

Gli spazi diversi possono avere gli stessi orari. Le configurazioni con is_retired = true non impediscono l'inserimento delle configurazioni sostitutive, poiché non sono offerte per nuove prenotazioni.

Il vincolo riguarda le configurazioni: più prenotazioni di gruppi diversi possono condividere una fascia, purché la somma dei posti prenotati rispetti la capienza. Il controllo applicativo e l'attuazione della transazione saranno definiti durante l'implementazione.

### Riduzione della capienza — Approvata

La riduzione della capienza viene rifiutata se il nuovo valore è inferiore ai posti già prenotati in almeno un intervallo futuro o in corso dello spazio. Si considerano tutte le prenotazioni sovrapposte nell'intervallo, comprese quelle riferite a configurazioni successivamente ritirate. Le prenotazioni completate non impediscono la modifica.

Esempio: con capienza attuale 24 e 18 posti prenotati complessivamente nello stesso intervallo, la riduzione a 20 è consentita e quella a 12 è rifiutata con un messaggio che identifica l'intervallo interessato.

Se la riduzione è necessaria, l'amministratore può rendere indisponibili le fasce future interessate, provocando la cancellazione delle relative prenotazioni e le notifiche già previste. Una volta eliminate le incompatibilità può ridurre la capienza e, se appropriato, rimuovere l'indisponibilità. Il sistema non sceglie autonomamente quali gruppi cancellare e non prevede una forzatura del limite.

Questo percorso di cancellazione automatica riguarda le prenotazioni future. Se una fascia incompatibile è già in corso, la gestione delle persone presenti avviene fuori dall'app e la riduzione resta bloccata fino al termine della fascia. Il controllo della capienza e il suo aggiornamento devono essere coordinati con le operazioni di prenotazione per evitare condizioni di concorrenza.

### Cancellazioni dei dati collegati — Approvate

| Elemento eliminato | Effetto approvato |
|---|---|
| Prenotazione | Elimina booking_participants e quindi le relative presenze; booking_requests rimane con booking_id = NULL |
| Account normale | Elimina le prenotazioni organizzate, le partecipazioni ad altre prenotazioni, favorites, reports con fotografie, notifications personali, auth_sessions e booking_requests dell'account |
| Spazio | Elimina prenotazioni future e completate con partecipazioni, disponibilità anche ritirate, indisponibilità, preferiti, segnalazioni con fotografie e space_services; il catalogo services rimane |
| Edificio | Elimina tutti gli spazi contenuti e applica a ciascuno le cancellazioni previste per lo spazio |

Se l'account eliminato era organizzatore, si elimina l'intera prenotazione anche in presenza di altri partecipanti. Se era soltanto partecipante, si elimina la sua partecipazione e la prenotazione degli altri rimane. La regola si applica anche ai dati storici, coerentemente con la cancellazione definitiva concordata. Gli altri utenti interessati dalle prenotazioni future eliminate ricevono una notifica.

Poiché il ruolo di organizzatore è nella partecipazione, il backend deve individuare e cancellare le prenotazioni organizzate prima di eliminare l'account. La sola cancellazione a cascata delle partecipazioni non è sufficiente: lascerebbe prenotazioni senza organizzatore.

Le modifiche al database e la generazione delle notifiche previste devono essere coordinate nella stessa transazione. Le fotografie richiedono anche una gestione coordinata del filesystem: una transazione del database non può annullare automaticamente la cancellazione di un file.

Le righe booking_requests appartenenti ad account che rimangono esistenti mantengono la chiave anche quando una cancellazione a cascata elimina la relativa prenotazione; booking_id diventa NULL come già concordato. Le righe dell'account eliminato vengono invece rimosse insieme all'account stesso.

Le righe `slot_occurrences` vengono eliminate con lo spazio. Non vengono invece eliminate quando si ritira una configurazione di disponibilità, perché rappresentano fasce concrete e non dipendono dalla permanenza della regola ricorrente che le ha generate.

## Precisazioni del contratto API

### Spazi consigliati: priorità al giorno attuale — Decisione dell'utente

La selezione dà priorità al giorno attuale nel fuso Europe/Rome. Per ciascuno spazio attivo si cerca la prima fascia ancora prenotabile di oggi, saltando quelle piene, indisponibili o oltre il termine di prenotazione. Rimane valido l'anticipo minimo concordato di un'ora.

Se esiste almeno uno spazio con una fascia prenotabile oggi, si consigliano soltanto spazi per oggi: massimo tre, ordinati per posti disponibili decrescenti nella fascia individuata e, a parità, per nome. Uno spazio compare al massimo una volta. Se oggi ne rimangono soltanto uno o due, non si completa la lista con spazi di domani.

Soltanto quando non esiste più alcuno spazio prenotabile oggi, si applica lo stesso criterio alle fasce del giorno successivo. Il passaggio al giorno successivo riguarda l'intera selezione, non i singoli spazi; i consigli non mescolano oggi e domani. L'orario 22:00 è un esempio, non una soglia fissa: conta l'effettiva prenotabilità delle fasce.

La correzione dell'utente sostituisce la precedente proposta di cercare per ogni spazio la prima fascia prenotabile indipendentemente dalla giornata. Il limite generale di 30 giorni per prenotare non è l'orizzonte di ricerca dei consigli.

### Filtri Disponibili ora e Posti ≥ 10 — Decisione dell'utente

Il filtro visualizzato come «Disponibili ora» non indica una fascia già in corso: cerca la prima fascia futura effettivamente prenotabile dello spazio, in ordine cronologico ed entro il limite generale di 30 giorni. Sono quindi esclusi gli intervalli iniziati, pieni, indisponibili o per i quali non è rispettato l'anticipo minimo di un'ora.

Usato da solo, «Posti ≥ 10» confronta la soglia con i posti liberi della prima fascia prenotabile, non con la capienza totale. In questo caso non passa a una fascia successiva soltanto per raggiungere la soglia.

Quando i due filtri sono attivi insieme, invece, il server cerca per ciascuno spazio la prima fascia cronologica che soddisfa entrambe le condizioni: deve essere prenotabile e avere almeno dieci posti liberi. Può quindi saltare una fascia precedente prenotabile ma con meno di dieci posti. Uno spazio senza una fascia conforme entro 30 giorni è escluso.

Esempio approvato: alle 10:30 la fascia 10:00–12:00 è già iniziata, la fascia 12:00–14:00 ha otto posti liberi e la fascia 14:00–16:00 ne ha quindici. Con entrambi i filtri lo spazio compare facendo riferimento alla fascia 14:00–16:00. Questa regola riguarda la pagina Spazi e non modifica i criteri separati dei consigli della Home.

### Statistiche — Significato degli indicatori approvato

L'utente distingue il conteggio delle prenotazioni dalle presenze effettive, da rapportare sia ai posti offerti sia ai posti prenotati. Mockup07.png e la pagina admin-statistics esistente presentano tre indicatori: Prenotazioni, Tasso di utilizzo e Check-in completati. I valori del frontend sono attualmente dimostrativi e non definiscono una formula di calcolo.

L'utente ha confermato i seguenti significati:

- Prenotazioni: numero di prenotazioni, contando ciascuna prenotazione di gruppo una sola volta.
- Tasso di utilizzo: presenze registrate tramite check-in divise per posti offerti, espresse in percentuale.
- Check-in completati: presenze registrate divise per partecipanti prenotati, espresse in percentuale. Il denominatore non è il numero di prenotazioni di gruppo.

Esempio approvato per una singola fascia: 20 posti offerti, 3 prenotazioni con 12 partecipanti complessivi e 9 check-in producono 3 prenotazioni, utilizzo del 45% e check-in completati del 75%. Il check-in è l'indicatore di presenza concordato, non una misurazione continua dell'occupazione fisica.

### Statistiche sul periodo — Criterio approvato

Nel periodo selezionato si considerano soltanto le fasce già terminate. Si includono le fasce offerte anche quando non hanno ricevuto prenotazioni e si escludono quelle rese indisponibili. Le fasce future o ancora in corso non contribuiscono a queste statistiche di utilizzo e presenza.

Il tasso di utilizzo si calcola dividendo la somma delle presenze per la somma dei posti offerti nelle fasce considerate, moltiplicando per 100. Non si fa la media semplice delle percentuali delle singole fasce. I check-in completati rapportano le presenze ai partecipanti prenotati nelle medesime fasce.

Esempio approvato: un'aula da 20 posti offre due fasce terminate; nella prima si registrano 10 presenze, nella seconda nessuna. I posti offerti complessivi sono 40 e il tasso di utilizzo è 10 / 40 × 100 = 25%.

La conservazione approvata è attuata da `slot_occurrences`: per ogni fascia concreta conserva capienza offerta e stato di disponibilità al momento del consolidamento, comprese le fasce senza prenotazioni. Le statistiche usano soltanto occorrenze terminate con `was_offered = true`. Questo adattamento tecnico non modifica la proposta inviata.

## Completamento del punto 1

Le strutture delle cinque tavole, il campo is_retired, le tabelle tecniche auth_sessions, booking_requests e slot_occurrences, il divieto di sovrapposizione delle fasce, la regola di riduzione della capienza e le cancellazioni dei dati collegati sono stati revisionati e approvati. Sono approvati anche la priorità al giorno attuale per gli spazi consigliati, il comportamento singolo e combinato dei filtri, il significato degli indicatori statistici e la conservazione dei dati storici necessari.

### Esito del consolidamento

Il contratto API è stato allineato alle decisioni approvate su autenticazione, consigli, filtro dei posti, richieste idempotenti, configurazioni ritirate, riduzione della capienza, cancellazioni e statistiche. Non sono stati modificati codice, database, proposta o tavole E/R.

La verifica ha individuato un'insufficienza per le statistiche storiche:

- `spaces.capacity` conserva soltanto la capienza attuale. Dopo una modifica non consente di conoscere quanti posti erano offerti in una fascia passata.
- `availabilities.is_retired` conserva il riferimento delle prenotazioni, ma da solo non documenta quando una configurazione ha smesso di essere offerta. Le fasce passate senza prenotazioni devono comunque contribuire ai posti offerti.
- Le modifiche o rimozioni delle indisponibilità possono cambiare la ricostruzione delle fasce passate escluse dal calcolo.

Esempio: una fascia terminata con 20 posti e 10 presenze ha utilizzo del 50%. Se la capienza viene successivamente portata a 30, usare il valore corrente produrrebbe circa il 33,3% per la medesima fascia. Le sole formule approvate non risolvono questa perdita di informazione.

È stata confermata la conservazione dei dati storici dei posti effettivamente offerti. La soluzione adottata è `slot_occurrences`, che registra le singole fasce e ne consolida capienza e disponibilità senza conservare dati personali. Le righe vengono eliminate con lo spazio e non alterano le cancellazioni definitive già concordate.

Il coordinamento di `availableNow` e `minSeats` è stato chiarito: `availableNow` cerca una fascia futura prenotabile, non quella già in corso; se `minSeats` è presente nella stessa richiesta, si cerca la prima fascia prenotabile che raggiunge anche la soglia. Con questa decisione sono risolte le questioni funzionali emerse durante il confronto. Il punto 2.1 ha tradotto il modello in `schema.sql`; il punto 2.2 ha classificato in `integrity-rules.md` i vincoli del database, i controlli del server e le operazioni transazionali. Il punto 2.3 ha predisposto `migrate.js`, il registro versionato e l'inizializzazione ripetibile. Il punto 2.4 ha sostituito la connessione provvisoria: `db.js` esegue le migrazioni, apre la connessione SQLite condivisa e consente a Express di avviarsi soltanto dopo la corretta inizializzazione del database. Il punto 2.5 ha aggiunto uno script idempotente per il catalogo fisso dei servizi e per la creazione controllata dell'amministratore tecnico, senza importare nel database i dati dimostrativi del frontend. Il punto 2.6 ha separato la configurazione Express dal processo HTTP e ha predisposto il prefisso `/api/v1` e la gestione uniforme degli errori, senza anticipare le API applicative.

## Completamento del punto 2

Il punto 2 è concluso con uno schema SQLite versionato, migrazioni atomiche, connessione condivisa, dati iniziali riproducibili, struttura Express separata e test automatici della base backend. `npm test` verifica migrazioni ripetibili, 16 tabelle applicative, chiavi esterne, unicità della connessione, inserimento idempotente di servizi e amministratore e risposte HTTP fondamentali.

Il database operativo non è stato creato automaticamente durante lo sviluppo: nascerà eseguendo il backend, la migrazione o il seed senza un percorso temporaneo. Non sono ancora implementati registrazione, login, token, endpoint applicativi o collegamento del frontend; queste attività iniziano nel punto 3.
