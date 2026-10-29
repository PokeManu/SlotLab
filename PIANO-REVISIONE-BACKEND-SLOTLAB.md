# Piano di revisione del backend di SlotLab

**Stato:** **100% — piano backend completato e verificato** il 13 ottobre 2026. Il precedente **95%** era una metrica dei primi passi, non il completamento reale; la chiusura attuale segue tutti i criteri della sezione 3.  
**Data:** 13 ottobre 2026.  
**Oggetto:** rendere il backend Node.js, Express e SQLite più leggibile e coerente con la struttura insegnata nel corso, senza attribuire al codice un'autorialità in base allo stile.

## 1. Origine e perimetro

Questo piano deriva dall'analisi in `ANALISI-BACKEND-SLOTLAB.docx` e dalle slide `../14. Node_Express.pdf` (in particolare pagine 7–14) e `../02. Introduzione alle architetture Web.pdf` (pagine 31–40). La slide 8 di Node/Express presenta il flusso **Client → Route → Middleware → Controller → Model → Database**. Nel progetto attuale le route spesso contengono insieme validazione, logica applicativa e query SQL; `backend/routes/admin.routes.js` è il caso più esteso.

Il piano riguarda anzitutto le **funzioni necessarie ma semplificabili**. Le funzioni facoltative per un server minimo sono elencate come decisioni distinte: non saranno cancellate automaticamente. Il frontend esistente deve rimanere utilizzabile durante la revisione. Non si avvia il punto 3.2 menzionato nelle istruzioni della cartella padre.

## 2. Decisioni già ricevute

| Tema | Decisione |
| --- | --- |
| Conservazione delle funzionalità | **Decidere funzione per funzione**. Nessuna autorizzazione generale a rimuovere API, schermate o dati. |
| Organizzazione del codice | Riorganizzare **tutto il backend per passi**, rendendo visibili Route, Middleware, Controller, Model e Database. Evitare moduli vuoti creati soltanto per imitare i nomi delle cartelle. |
| Login e sessioni | Conservare il comportamento attuale: JWT, rinnovo tramite cookie, ruoli e flussi del frontend. Si può semplificare l'implementazione senza indebolire i controlli necessari. |
| Foto nelle segnalazioni | Conservare la funzione e sostituire il parser multipart scritto a mano con una libreria dedicata. La libreria e la sua configurazione saranno verificate prima dell'implementazione. |
| Disponibilità e statistiche | Conservare gli stessi risultati osservabili nel sito per fasce ricorrenti, timer e statistiche. Le semplificazioni non devono cambiare i dati mostrati. |
| Chiusura del server | Eliminare `stopServer()` e il relativo shutdown personalizzato; lasciare a `Ctrl+C` la terminazione del processo e adattare i test che oggi importano la funzione. |
| Accesso SQLite e validazioni | Accorpare i wrapper SQLite. Condividere solo i validatori con regole equivalenti, mantenendo le risposte API attuali. |
| Orario italiano | Usare una funzione comune in `domain/time.js`, senza cambiare le regole sulle fasce e sul cambio dell'ora. |
| Transazioni | Conservare atomicità e isolamento; migliorare la leggibilità senza riscrivere il meccanismo per mera riduzione di righe. |
| Limiti e cookie | Conservare gli stessi limiti di richiesta e la stessa protezione delle operazioni basate sul cookie; rendere solo più chiaro il codice interno. |
| Controlli ridondanti | Eliminare `knownPrefixes` e la seconda impostazione di `Cache-Control: no-store` nella route di login, verificando che 404 e header risultanti restino corretti. |
| Recupero password | Mantenere il recupero via email e i suoi controlli. Il comportamento con SMTP non configurato va registrato nella fotografia iniziale prima di qualsiasi intervento. |
| Foto delle segnalazioni | Mantenere per ora la lettura dei BLOB nel database e delle foto storiche su disco. Sono due modalità di conservazione, non necessariamente due copie della stessa foto. |
| Route `/` e dati iniziali | Mantenere il controllo minimale `GET /`, `db:seed` e `db:seed-demo`. |
| Route di dettaglio non usate dal sito | Rimuovere le cinque route `GET` individuate in D14a–D14e. Conservare gli altri metodi sugli stessi percorsi e verificare il comportamento 404 dopo la rimozione. |

**Regola di lavoro:** per ogni funzione proposta per la rimozione o per un cambiamento di comportamento, registrare prima la decisione nella tabella della sezione 4. Finché la decisione è aperta, il piano prevede soltanto refactoring che preserva il comportamento. Il 12 ottobre 2026 l'utente ha autorizzato il lavoro per passi fino al 20%, poi al 25%, al 30% e infine al 50% stimato del piano; il 13 ottobre ha autorizzato a procedere fino al 65%, al 75%, all'80%, al 90%, al 95% e infine al completamento integrale. Il completamento dipende dai criteri della sezione 3, non dalla vecchia scala dei passi.

## 3. Obiettivo tecnico e criterio di completamento

Una route dovrebbe dichiarare il percorso, i middleware applicabili e il controller. Il controller dovrebbe leggere la richiesta, applicare la regola e costruire la risposta. I moduli Model o di accesso ai dati dovrebbero contenere le query. I moduli `domain/` e `security/` possono restare separati quando esprimono una regola o una protezione, invece di essere forzati in un Model.

La revisione sarà completa quando:

1. ogni famiglia di route avrà responsabilità leggibili e le query più articolate saranno separate dagli handler HTTP;
2. i wrapper SQLite, le validazioni e la conversione dell'ora italiana non saranno duplicati senza motivo;
3. il caricamento delle foto funzionerà con una libreria multipart, con limiti e controlli sui file equivalenti agli attuali;
4. login, rinnovo, ruoli, prenotazioni, disponibilità, foto e statistiche continueranno a funzionare;
5. ogni rimozione eventuale avrà una decisione esplicita, test pertinenti e una nota su API, database e frontend interessati;
6. la suite backend e i flussi browser interessati saranno verificati dopo ogni tranche, non solo alla fine.

## 4. Registro delle decisioni funzione per funzione

Le decisioni qui sotto definiscono il perimetro del piano; **non indicano che il codice sia già stato modificato**. Una rimozione riguarda soltanto il metodo e il percorso indicati, non gli altri metodi eventualmente registrati sullo stesso percorso.

| ID | Funzione o gruppo | Uso attuale | Proposta per il piano | Decisione |
| --- | --- | --- | --- | --- |
| D1 | `startServer()`, `stopServer()`, `shutdown()` in `backend/server.js` | Avvio; chiusura ordinata e test | Tenere l'avvio. Eliminare `stopServer()`, `shutdown()` e gli handler personalizzati dei segnali; adattare i test per chiudere il server che hanno avviato e le altre risorse senza reintrodurre una funzione applicativa di spegnimento. | **Decisa**: eliminare e adattare i test |
| D2 | `runOccurrenceConsolidation()`, timer e `consolidateOccurrences()` | Aggiornano stati e dati storici | Conservare risultati e automatismi visibili; valutare soltanto una migliore collocazione del codice e la riduzione delle chiamate duplicate. | Risultati da conservare; implementazione da valutare |
| D3 | `queries()` e wrapper `query/get/run/all` ripetuti | Accesso SQLite nelle route | Usare un accesso condiviso coerente, senza alterare gestione degli errori e isolamento delle transazioni. | **Decisa**: accorpare |
| D4 | Validatori di ID, paginazione, date e orari | Proteggono input API | Accorpare solo i controlli veramente equivalenti; mantenere codici e messaggi HTTP richiesti dal frontend. | **Decisa**: solo equivalenti |
| D5 | `romeDateTime()` duplicata e `domain/time.js` | Confronti in Europe/Rome | Unificare la conversione in un modulo di dominio, conservando regole su cambio dell'ora e finestre temporali. | **Decisa**: funzione comune |
| D6 | `qualifyingSpaces()` | Filtri, disponibilità e posti liberi | Spezzare in passaggi leggibili; non ridurre i filtri o cambiare il risultato delle ricerche. | Funzione da conservare |
| D7 | `parseMultipart()` | Foto delle segnalazioni | Sostituire con libreria dedicata; mantenere formato delle richieste frontend, limite dimensione, controllo del tipo reale e risposte d'errore. | **Decisa**: foto e libreria |
| D8 | `requireAuth()`, `requireRole()`, token, cookie | Accesso e sessioni | Mantenere il modello e i ruoli; estrarre funzioni semplici dove migliora la lettura, senza togliere verifiche di sicurezza necessarie. | **Decisa**: stesso comportamento |
| D9a | `rateLimit()` | Limiti ai tentativi sulle route sensibili | Conservare soglie, finestre e risposte attuali; semplificare soltanto il codice interno se la verifica ne dimostra l'equivalenza. | **Decisa**: stessi limiti |
| D9b | `requireCookieRequest()` | Protezione delle richieste con cookie | Conservare la protezione attuale e migliorare soltanto la leggibilità. | **Decisa**: stessa protezione |
| D10 | `transaction()` | Operazioni su più tabelle | Conservare il meccanismo e le sue garanzie; migliorare soltanto nomi, separazione delle responsabilità e leggibilità dove utile. | **Decisa**: garanzie invariate |
| D11 | `statistics()` e logica di `occurrences.js` | Pannello amministrativo | Separare query, calcoli e orchestrazione dove utile, mantenendo gli stessi valori mostrati. | **Decisa**: risultati invariati |
| D12a | `knownPrefixes` in `api.routes.js` | Controllo manuale dei prefissi API | Eliminare il middleware e lasciare che router Express e gestore 404 trattino gli URL sconosciuti; confrontare le risposte HTTP. | **Decisa**: eliminare |
| D12b | `no-store` ripetuto nel login | Header già impostato dal router auth | Eliminare l'impostazione nella singola route, lasciando invariato l'header finale. | **Decisa**: eliminare il doppione |
| D13a | Recupero password SMTP | Recupero via email, revoca delle sessioni e limiti ai tentativi | Conservare la funzione e il comportamento attuale; registrare il caso SMTP non configurato nei test di riferimento. | **Decisa**: mantenere |
| D13b | Foto delle segnalazioni nel database o su disco | Le nuove foto sono BLOB; quelle storiche possono essere file. La lettura supporta entrambe le modalità. | Conservare entrambe le modalità per compatibilità con i dati esistenti; non migrare né eliminare file durante la revisione. | **Decisa**: mantenere entrambe per ora |
| D14a | `GET /api/v1/buildings/:buildingId` | Dettaglio edificio; oggi senza chiamate dal frontend | Rimuovere soltanto questa route `GET`; verificare che l'URL produca il 404 previsto. | **Decisa**: rimuovere |
| D14b | `GET /api/v1/buildings/:buildingId/spaces` | Spazi di un edificio; oggi senza chiamate dal frontend | Rimuovere soltanto questa route `GET`; verificare che l'URL produca il 404 previsto. | **Decisa**: rimuovere |
| D14c | `GET /api/v1/reports/:reportId` | Dettaglio segnalazione; oggi senza chiamate dal frontend | Rimuovere soltanto questa route `GET`; conservare lista, creazione e foto. | **Decisa**: rimuovere |
| D14d | `GET /api/v1/admin/buildings/:buildingId` | Dettaglio edificio per admin; oggi senza chiamate dal frontend | Rimuovere soltanto questa route `GET`; conservare `PATCH` e `DELETE` sullo stesso percorso. | **Decisa**: rimuovere |
| D14e | `GET /api/v1/admin/users/:userId` | Dettaglio utente per admin; oggi senza chiamate dal frontend | Rimuovere soltanto questa route `GET`; conservare la cancellazione sullo stesso percorso. | **Decisa**: rimuovere |
| D14f | `GET /` | Controllo minimale del server, coperto da test | Conservare la risposta `Server attivo`. | **Decisa**: mantenere |
| D14g | `db:seed` e `db:seed-demo` | Preparazione dei dati iniziali e della demo; usati anche nei test | Conservare entrambi gli script e la protezione del database operativo. | **Decisa**: mantenere |
| D15 | Totale paginato in `GET /api/v1/admin/users` | `await getDatabase().get()` riceve l'oggetto SQLite invece della riga: nel JSON mancano `totalElements` e `totalPages` vale `null`. Il frontend usa `totalPages`. | Correggere usando l'adapter `queries()` e fissare con test HTTP totale, pagine e ricerca. È una correzione del contratto già previsto, senza cambiare URL, filtro o ordinamento. | **Decisa nel perimetro di questa revisione**: correggere il difetto verificato, con test prima e dopo |

## 5. Sequenza di lavoro proposta

Ogni tranche produce una modifica piccola e verificabile. Le scelte sulle funzioni sono registrate; se durante il lavoro emerge un'altra modifica di comportamento, documentarla e discuterla prima di applicarla. Il vecchio traguardo del 95% era stato raggiunto con il passo 17 verificato; i passi 18–25 hanno completato il perimetro effettivo. D15 è stata registrata prima della correzione del totale admin utenti, difettoso rispetto al contratto paginato usato dal sito.

### Tranche 0 — Fotografia del comportamento attuale

- Inventariare route, metodi, middleware, codici di risposta e chiamate effettive da `src/app/api/` e `src/app/auth/`.
- Mappare test backend, database temporanei e schermate Chrome da usare come verifica.
- Individuare i dati locali da preservare; i test di migrazione e seed devono usare un database separato.
- Registrare i casi osservabili più delicati: login/refresh/logout, ruoli, doppia prenotazione, cambio disponibilità, foto, statistiche e recupero password.

**Uscita:** tabella di contratti API e controlli eseguibili. Nessuna modifica funzionale.

### Tranche 1 — Utilità condivise e struttura pilota

- Centralizzare i wrapper SQLite equivalenti, prendendo `backend/db/transaction.js:3` come punto di confronto.
- Centralizzare validazioni davvero comuni e conversioni `Europe/Rome`, senza cambiare messaggi o codici degli errori.
- Usare una famiglia di route piccola, per esempio preferiti o notifiche, come pilota della struttura Route → Controller → Model.
- Evitare un livello di astrazione che contenga solo passaggi meccanici: ogni nuovo modulo deve avere una responsabilità spiegabile.
- Rimuovere D14a e D14b dopo aver registrato le risposte correnti e verificato che elenco edifici, elenco spazi e ricerca continuino a funzionare.

**Verifica:** test della famiglia pilota, errori 400/401/403/404, confronto delle risposte JSON e controllo in Chrome della schermata collegata.

### Tranche 2 — Account, sessioni e profilo

- Separare definizioni HTTP, logica di login/registrazione/refresh e accesso ai dati in `auth.routes.js` e `users.routes.js`.
- Conservare JWT, rotazione del refresh, cookie, ruoli, invalidazione delle sessioni e formato delle risposte.
- Conservare limiti e protezione del cookie; semplificare il codice di `rateLimit()` e `requireCookieRequest()` soltanto se soglie, risposte e controlli restano equivalenti.
- Tenere separati password, validazione e foto profilo nei moduli già appropriati.

**Verifica:** registrazione, login, refresh, logout, utente senza token, ruolo non autorizzato, cambio password e profilo; test backend e flussi Chrome.

### Tranche 3 — Catalogo e prenotazioni

- Dividere `qualifyingSpaces()` in passaggi riconoscibili e separare query da costruzione delle risposte.
- Spostare in moduli mirati la logica di prenotazioni e partecipanti che oggi allunga gli handler.
- Conservare capienza, finestre temporali, idempotenza, disponibilità e transazioni.
- Conservare il meccanismo di `transaction()`; limitare la revisione a leggibilità e collocazione del codice, verificando atomicità e concorrenza.

**Verifica:** ricerca e filtri, disponibilità, creazione/cancellazione prenotazione, partecipanti, conflitti di posti, doppio invio e cambi d'ora nei test pertinenti.

### Tranche 4 — Segnalazioni e fotografie

- Selezionare una libreria multipart compatibile con lo stack in uso e documentare perché è stata scelta.
- Sostituire `parseMultipart()` mantenendo la richiesta `FormData` del frontend e i limiti attuali sulle foto.
- Continuare a validare contenuto effettivo, dimensione e autorizzazione; gestire chiaramente gli errori 400/413/415.
- Conservare entrambe le modalità di lettura delle foto (BLOB e file storici); la sostituzione del parser non autorizza a eliminare file o colonne del database.
- Rimuovere D14c in un passaggio dedicato, verificando che lista, creazione e lettura della foto della segnalazione restino disponibili.

**Verifica:** invio segnalazione con e senza foto, formati ammessi e non ammessi, file troppo grande, lettura della foto e accesso non autorizzato.

### Tranche 5 — Area amministrativa

- Dividere `admin.routes.js` per aree: edifici, spazi, disponibilità, avvisi, prenotazioni, segnalazioni, utenti e statistiche.
- Spostare le query nei moduli dati e le regole come `reconcileAvailability()` in servizi o controller con responsabilità esplicita.
- Conservare gli URL attuali, i permessi admin, le notifiche collegate, le transazioni e le risposte usate da Angular.
- Procedere una famiglia di route alla volta; non spezzare il file in un'unica modifica massiva.
- Rimuovere D14d e D14e in passaggi dedicati; mantenere `PATCH`/`DELETE` per gli edifici e `DELETE` per gli utenti sugli stessi percorsi.

**Verifica:** test della famiglia appena spostata e schermata Chrome corrispondente, compresi casi 403, 404 e conflitti 409.

### Tranche 6 — Occorrenze, statistiche e ciclo del server

- Separare in modo leggibile consolidamento, calcolo statistico e avvio del timer, mantenendo gli stessi risultati e tempi osservabili.
- Eliminare `stopServer()`, `shutdown()` e gli handler dei segnali in un passaggio dedicato. Adattare i test che importano `stopServer()` per chiudere il listener e il database in modo isolato; verificare anche che il timer non continui a operare dopo la chiusura del server nei test.
- Valutare eventuali controlli di configurazione ridondanti senza compromettere avvio locale e database esistenti.
- Rimuovere `knownPrefixes` e il `no-store` duplicato solo dopo aver registrato le risposte 404 e gli header correnti; confrontare il risultato dopo la modifica.

**Verifica:** avvio/arresto, test che avviano il server, prenotazioni concluse, consolidamento ricorrente e confronto dei valori della pagina statistiche.

### Tranche 7 — Verifica finale e documentazione per l'esame

- Eseguire l'intera suite backend su dati di test isolati e ripetere i flussi principali del sito in Chrome; non usare Safari come browser di riferimento.
- Verificare che il frontend non richieda adattamenti non documentati e che il backend locale continui a rispondere tramite il proxy `/api`.
- Preparare una mappa breve dei file da mostrare in Visual Studio Code e un esempio completo richiesta → middleware → controller → model → SQLite → risposta.
- Aggiornare questo file con decisioni prese, tranche concluse, verifiche riuscite, differenze intenzionali e punti rimasti aperti.

**Uscita:** backend funzionante e struttura presentabile, con ogni modifica giustificata e verificata.

## 6. Regole di verifica e di arresto

- Non modificare il frontend per compensare una regressione backend non voluta. Un'eventuale modifica coordinata si pianifica e si dichiara prima.
- Non usare il database personale o dimostrativo come banco di prova per migrazioni distruttive.
- Non cancellare file caricati, dati, migrazioni o endpoint finché la relativa decisione è aperta.
- Se una tranche non supera i test, correggerla prima di aprire la tranche seguente.
- Aggiornare il piano dopo ogni tranche con stato reale, file interessati, test eseguiti e prossimo intervento. Non segnare completato ciò che non è stato verificato.

## 7. Stato delle decisioni e prossimo passo

Tutte le decisioni D1–D14g hanno una destinazione nel piano. La scelta di rimuovere D14a–D14e riguarda cinque route `GET` specifiche e non autorizza a eliminare le altre operazioni sugli stessi percorsi o i dati collegati.

**Dipendenze frontend verificate prima di attuare D14a–D14e:** la mappa usa `GET /api/v1/buildings` e `GET /api/v1/spaces`, poi associa gli spazi agli edifici tramite `building.id`. Quando si apre uno spazio, la sua pagina usa `GET /api/v1/spaces/:spaceId` e la disponibilità dello spazio; queste route restano. L'amministrazione degli edifici carica `GET /api/v1/admin/buildings` e compila il modulo di modifica con i dati dell'elemento già presente nell'elenco. L'amministrazione degli spazi usa invece `GET /api/v1/admin/spaces/:spaceId`, che resta. Prima di eliminare ciascuna route di dettaglio, riesaminare le chiamate reali e i test, perché il frontend può evolvere.

**Stato finale:** l'utente ha autorizzato il completamento integrale. Le responsabilità Route → Middleware → Controller → Model → SQLite sono leggibili per tutte le famiglie; le decisioni D1–D15 sono state attuate o conservate motivatamente come descritto nel diario. `rateLimit()` e `requireCookieRequest()` restano invariati perché nessuna semplificazione equivalente era necessaria. La suite backend, la build frontend e i flussi Chrome descritti nel passo 26 sono riusciti. Le cinque rimozioni D14a–D14e hanno test 404 e conservano le operazioni ancora usate dal sito.

## 8. Verifica mirata delle cinque route `GET` candidate alla rimozione

**Analisi del 12 ottobre 2026, senza modifiche al codice backend.** Sono stati controllati servizi e pagine Angular, test frontend/backend, route Express, codice generato presente nel progetto e riferimenti documentali. Le cinque route non risultano chiamate dal sito attuale. La valutazione riguarda il frontend di SlotLab presente nel repository; non prova l'assenza di client esterni o vecchi collegamenti diretti.

| Route da rimuovere | Come il sito ottiene oggi le informazioni | Cosa deve restare |
| --- | --- | --- |
| `GET /api/v1/buildings/:buildingId` | La mappa carica `GET /api/v1/buildings` e seleziona l'edificio dall'elenco. | Elenco edifici. |
| `GET /api/v1/buildings/:buildingId/spaces` | La mappa carica tutte le pagine di `GET /api/v1/spaces?size=100` e raggruppa gli spazi per `building.id`. | Elenco spazi, paginazione e funzione condivisa `spacesResponse()`. |
| `GET /api/v1/reports/:reportId` | La pagina segnalazioni usa l'elenco `GET /api/v1/reports`; le foto usano `GET /api/v1/reports/:reportId/photo`. | Elenco, creazione e foto delle segnalazioni. |
| `GET /api/v1/admin/buildings/:buildingId` | L'amministrazione carica l'elenco e compila il modulo con l'edificio selezionato. | Elenco, `PATCH` e `DELETE` dell'edificio. |
| `GET /api/v1/admin/users/:userId` | L'amministrazione usa l'elenco paginato e ricercabile. | Elenco e `DELETE` dell'utente. |

Il dettaglio di **un singolo spazio** è un'altra route, `GET /api/v1/spaces/:spaceId`, effettivamente chiamata dalla pagina di dettaglio; resta. Resta anche `GET /api/v1/admin/spaces/:spaceId`, usata nella modifica degli spazi amministrativi. Eliminare il solo handler di `GET /buildings/:buildingId/spaces` non deve eliminare `spacesResponse()`, condivisa con l'elenco generale.

**Esito della fotografia iniziale, prima degli interventi:** `npm test` nel backend ha superato 119 test su 120. L'unico fallimento era nel test `prenotazioni admin: elenco reale con organizzatore e paginazione` (`backend/test/auth.test.js`): inseriva una prenotazione datata 14 settembre 2026, attendeva `confirmed` e riceveva `completed` al 12 ottobre 2026. Il test è stato poi corretto nel passo 1 della sezione 9; la suite attuale è verde. La fotografia iniziale non conteneva test specifici per le cinque route candidate, che richiederanno verifiche quando verranno rimosse.

**Verifica necessaria quando si attuerà la rimozione:** controllare il `404 ROUTE_NOT_FOUND` per un utente autorizzato su ciascuna delle cinque route, poi elenco edifici/spazi/utenti/segnalazioni, dettagli degli spazi, foto, `PATCH` e `DELETE` degli edifici e `DELETE` degli utenti. Le richieste anonime a route protette possono fermarsi prima con `401`, per effetto dei middleware di autenticazione. Ripetere test e flussi Chrome interessati e distinguere il fallimento già presente da eventuali regressioni nuove.

## 9. Diario di avanzamento e baseline del backend

### Criterio storico per le percentuali dei passi 1–17

Il paragrafo seguente fotografa il punteggio e gli incompleti **al termine del passo 17**. Non descrive lo stato finale del progetto.

Le percentuali sono **stime di lavoro ponderate**; un punto viene contato soltanto dopo modifica conclusa, verifica e registrazione qui. Fotografia iniziale delle API e dei dati **8%**, correzione del test con data fissa e suite verde **2%**, pilota completo preferiti con accesso SQLite condiviso e verifiche **10%**, rimozione mirata D14a–D14b con verifiche **5%**, riorganizzazione e verifiche della famiglia notifiche **5%**, conversione comune Europe/Rome **5%**, accesso SQLite condiviso nel catalogo **5%**, paginazione comune **5%**, accesso SQLite condiviso nelle segnalazioni **5%**, foto profilo Route → Controller → Model con adapter condiviso **5%**, wrapper `all/get` amministrativi condivisi **5%**, accesso SQLite condiviso negli handler admin degli edifici con test HTTP dedicato **5%**, letture elenco/dettaglio degli spazi admin con test HTTP dedicato **5%**, correzione D15 del totale utenti admin con test HTTP e Chrome **5%**, registrazione Route → Controller → Model con adapter comune e verifiche **5%**, login Route → Controller → Model con verifiche **5%**, refresh/logout Route → Controller → Model con verifiche **5%**, autenticazione delle richieste e profilo/cambio password con query nei model e verifiche **5%**: totale **95%**. La centralizzazione degli altri wrapper D3, gli altri validatori D4 da valutare uno per uno, le rimozioni D14c–D14e e la parte rimanente delle tranche 1–7 restano da svolgere. Il 95% è una stima di avanzamento adottata per suddividere il lavoro, non una misura di copertura del codice: i criteri della sezione 3 non sono ancora tutti soddisfatti. Non si attribuisce una percentuale a un intervento lasciato a metà.

**Misura finale ricalibrata:** i passi 18–26 hanno chiuso ciò che il vecchio punteggio lasciava fuori. Il 100% corrisponde ora a tutte le tranche 0–7 e a tutti e sei i criteri di accettazione verificati nel passo 26. Le percentuali dei passi 1–17 restano nel diario come cronologia, senza essere sommate al nuovo esito.

### Passo 1 — Baseline e test datato: completato, 10%

**Inventario dei contratti principali.** `backend/app.js` monta `/`, `/api/v1`, il gestore 404 e quello degli errori. Il router API divide auth, users, catalogo, bookings, favorites, reports, notifications e admin. La tabella riassume metodi, autorizzazioni e comportamenti da mantenere; gli URL esatti restano definiti nei rispettivi file `backend/routes/*.routes.js`.

| Famiglia | Metodi e operazioni principali | Autorizzazione e contratto da preservare |
| --- | --- | --- |
| `/auth` | `POST` registrazione, login, refresh, logout, recupero password | Rate limit; JWT e cookie per la sessione; `204` uniforme nel recupero anche senza SMTP configurato. |
| `/users` | `GET` profilo/foto, `PUT` e `DELETE` foto, `PATCH` password, `DELETE` account | Bearer e ruolo; accesso soltanto ai dati dell'account corrente. |
| `/buildings`, `/spaces` | `GET` elenchi, dettaglio spazio e disponibilità; `POST` check-in | Bearer e ruolo user; filtri, paginazione e dati della mappa. Le due route edificio D14a–D14b saranno rimosse più avanti con test mirati. |
| `/bookings` | `GET`, `POST`, `DELETE` per prenotazioni e partecipanti | Bearer e ruolo user; capienza, finestre temporali, idempotenza, transazioni. |
| `/favorites` | `GET` elenco, `POST` aggiunta, `DELETE` rimozione | Bearer e ruolo user; `201` nuova aggiunta, `200` duplicato, `204` rimozione. È la famiglia pilota. |
| `/reports`, `/spaces/:id/reports` | `GET` elenco/foto/dettaglio, `POST` creazione | Bearer e ruolo user; permessi sulla foto e `FormData`. Il dettaglio D14c sarà rimosso più avanti. |
| `/notifications` | `GET` elenco, `PATCH` lettura singola o globale | Bearer e ruolo user/admin; separazione dei dati per utente. |
| `/admin` | `GET`, `POST`, `PATCH`, `DELETE` per edifici, spazi, disponibilità, prenotazioni, segnalazioni, utenti, statistiche e avvisi | Bearer e ruolo admin; `403` per ruolo errato; non perdere operazioni omonime alle route D14d–D14e. |

**Errori e controlli osservabili.** `requireAuth()` restituisce `401` per credenziali assenti o non valide; `requireRole()` restituisce `403`; `notFound()` restituisce `404 ROUTE_NOT_FOUND`; `rateLimit()` usa `429` e `Retry-After`; il gestore errori non espone dettagli interni per `500`. Il cookie di refresh/logout richiede gli header di protezione esistenti. Il frontend usa i servizi in `src/app/api/` per elenchi e dettagli; il confronto sulle cinque route candidate è documentato nella sezione 8.

**Dati e verifica di riferimento.** I test backend usano database temporanei tramite `SLOTLAB_DB_PATH`; non sono stati usati il database operativo locale `backend/db/database.sqlite`, lo snapshot `backend/db/initial.sqlite`, le foto in `backend/uploads/reports/` o le migrazioni come bersaglio di test distruttivi. La suite iniziale aveva 119 test superati su 120 per una prenotazione con data fissa passata. In `backend/test/auth.test.js` il test ora sceglie una data futura rispetto all'esecuzione, preservando le asserzioni sullo stato `confirmed`. Dopo la modifica, `npm test` nel backend: **120 superati, 0 falliti**. Nessun file di produzione o frontend è stato modificato in questo passo.

**Passo successivo eseguito:** adapter SQLite condiviso e separazione completa della famiglia `/favorites` in route, controller e model. D3 resta parziale finché gli altri moduli non avranno adottato l'adapter.

### Passo 2 — Pilota preferiti e adapter SQLite: completato, 20%

**Modifiche di produzione.** `backend/db/query.js` definisce una sola factory `queries(database)` per `get`, `all` e `run`; `backend/db/transaction.js` la riutilizza conservando connessione separata, `BEGIN IMMEDIATE`, commit, rollback, chiavi esterne e attesa SQLite. `backend/routes/favorites.routes.js` ora dichiara middleware e percorsi; `backend/controllers/favorites.controller.js` gestisce input e risposta HTTP; `backend/models/favorites.model.js` contiene le query per elenco, conteggio, verifica, aggiunta e rimozione. Le altre famiglie di route non sono state rifattorizzate in questa tranche.

**Contratto preservato.** `GET /api/v1/favorites` conserva ordinamento, campi degli spazi e paginazione; `POST /api/v1/favorites/:spaceId` conserva `201` per il primo inserimento, `200` per il duplicato, `400 INVALID_SPACE_ID` e `404 SPACE_NOT_FOUND`; `DELETE` conserva `204` anche se il preferito era già assente. `requireAuth()` e ruolo `user` restano nel router. L'adapter continua a restituire `changes` e `lastId`, necessari anche alle transazioni esistenti.

**Test aggiunti e verifiche.** `backend/test/favorites-http.test.js` usa un database SQLite temporaneo e verifica elenco vuoto, paginazione su due spazi, dati edificio, errori di paginazione, aggiunta, duplicato, cancellazione idempotente, ID non valido, spazio inesistente, `401` e `403`. Suite backend completa dopo la modifica: **127 test superati, 0 falliti**. Controllo sintattico dei nuovi file e controllo delle differenze: superati. Il frontend è stato compilato dal server di sviluppo senza errori applicativi.

**Chrome con dati isolati.** È stato creato un database temporaneo fuori dal repository, popolato con seed e un account fittizio. In Google Chrome sono riusciti login, apertura della pagina Preferiti vuota, aggiunta di “Aula Studio A1” dalla pagina Spazi, comparsa nella pagina Preferiti con conteggio `1 preferito` e rimozione con ritorno a `0 preferiti`. Il database temporaneo è stato eliminato e i server di prova sono stati fermati. Non sono stati modificati il database operativo, le foto esistenti, il frontend o il punto 3.2.

**Stato delle tranche:** tranche 0 conclusa; tranche 1 avviata con il pilota `/favorites` concluso; centralizzazione globale D3, D4 e D5, rimozioni D14a–D14b e resto della tranche 1 ancora da svolgere. Tranche 2–7 non avviate. Nessuna modifica di questo 20% resta non verificata o non documentata.

### Passo 3 — Rimozione delle due route GET degli edifici: completato, 25%

**Decisioni attuate.** In `backend/routes/catalog.routes.js` sono stati rimossi soltanto `GET /api/v1/buildings/:buildingId` (D14a) e `GET /api/v1/buildings/:buildingId/spaces` (D14b). È stato tolto anche il parametro `buildingId` di `spacesResponse()` e il relativo filtro, ora inutilizzati. Restano `GET /api/v1/buildings`, `GET /api/v1/spaces`, `GET /api/v1/spaces/:spaceId`, la disponibilità del singolo spazio, le tabelle e i dati. Nessun file frontend è stato modificato.

**Verifica mirata.** Il nuovo `backend/test/catalog-routes-http.test.js` usa account e SQLite temporanei: le due URL rimosse restituiscono `404 ROUTE_NOT_FOUND` all'utente autorizzato, `401` senza token e `403` con ruolo admin; gli elenchi edifici/spazi, la paginazione, il dettaglio e la disponibilità dello spazio restano disponibili. Prima della rimozione il test della nuova aspettativa `404` ha rilevato `200`, confermando che la verifica intercetta effettivamente il cambiamento. Dopo la rimozione: **3 test mirati superati** e suite backend completa **130/130 superati**. Controlli sintattici e `git diff --check` sui file modificati: superati.

**Frontend e Chrome.** I test Angular mirati su API della mappa, componente mappa e dettaglio spazio hanno superato **13/13** controlli. In Google Chrome, con un database di prova isolato, sono riusciti login, apertura dell'«Edificio test» sulla mappa, visualizzazione dell'«Aula test» associata e caricamento della pagina di dettaglio con edificio e capienza corretti. Il tentativo di eseguire Vitest in `ChromeHeadless` richiedeva un pacchetto browser non installato: per questo i test Angular sono stati eseguiti in jsdom e il flusso reale è stato controllato separatamente in Chrome. Nessun pacchetto è stato installato. I server di prova sono stati fermati e il database temporaneo è stato eliminato.

**Stato delle tranche aggiornato:** tranche 0 conclusa; tranche 1 parzialmente conclusa con pilota `/favorites` e D14a–D14b verificati. Restano D3–D5 nelle altre famiglie e la riorganizzazione delle route successive; tranche 2–7 non avviate. Prossimo intervento: adottare l'accesso SQLite condiviso in una famiglia di route alla volta, con test prima di proseguire. Nessuna modifica di questo 25% resta non verificata o non documentata.

### Passo 4 — Notifiche con adapter SQLite condiviso: completato, 30%

**Modifiche di produzione.** `backend/routes/notifications.routes.js` ora dichiara soltanto middleware e tre percorsi, mantenendo `requireAuth` e i ruoli `user`/`admin`. `backend/controllers/notifications.controller.js` contiene validazione, mappatura JSON e risposte HTTP; `backend/models/notifications.model.js` contiene elenco, conteggio, ricerca per utente e aggiornamenti SQL. È stato eliminato l'accesso SQLite duplicato nella route riutilizzando `backend/db/query.js`. L'ordine di `/read-all` prima di `/:notificationId/read`, i codici, i messaggi e la forma delle risposte restano invariati. Nessun frontend, schema o dato operativo è stato modificato.

**Verifiche di riferimento e regressione.** Il nuovo `backend/test/notifications-http.test.js` usa SQLite e account temporanei e copre ordine, campi e paginazione dell'elenco, errori di paginazione e ID, lettura singola ripetuta, `read-all`, separazione dei dati tra utenti, `401` e accesso admin. I suoi **5 test** erano verdi prima del refactoring e sono rimasti verdi dopo. La suite backend completa ha superato **135/135** test. Controlli sintattici dei file coinvolti e `git diff --check` superati. I test Angular mirati su API, stato e pagina Notifiche hanno superato **8/8** controlli.

**Chrome con dati isolati.** Con un database temporaneo e il server locale, in Google Chrome sono riusciti login, caricamento di due notifiche, lettura di una notifica con contatore da 2 a 1, lettura globale con scomparsa del contatore e ricaricamento della pagina con stato letto persistente. La scheda e i server di prova sono stati chiusi; il database temporaneo è stato eliminato. Non è stato avviato il punto 3.2.

**Stato delle tranche aggiornato:** tranche 0 conclusa; tranche 1 parziale con `/favorites`, D14a–D14b e `/notifications` verificati. D3 resta incompleto nelle altre famiglie; D4–D5 non sono ancora stati centralizzati. Tranche 2–7 non avviate. Prossimo intervento: scegliere un'altra famiglia limitata per D3 o affrontare un validatore realmente equivalente, con contratto e test di riferimento prima della modifica. Nessuna modifica del 30% resta non verificata o non documentata.

### Passo 5 — Orario italiano condiviso: completato, 35%

**Modifiche.** `backend/domain/time.js` espone `romeLocalDateTime()` sopra `romeNow()`, con formato `YYYY-MM-DD HH:mm`. `backend/routes/admin.routes.js` e `backend/security/delete-account.js` usano questa funzione al posto dei formatter locali; l'export preesistente `romeDateTime` del modulo account resta come alias. `backend/db/occurrences.js` riusa le funzioni di dominio per data e data/ora locali, preservando `TIME_ZONE` come alias. La conversione inversa `localDateTimeToInstant()` resta invariata. `backend/db/statistics.js` usa già `romeNow()` e conserva il proprio valore di ritorno strutturato.

**Verifiche.** In `backend/test/time.test.js` sono stati aggiunti controlli su inverno, estate e i due cambi dell'ora del 2026. Sintassi e scansione dei formatter superate: nel codice di produzione resta un unico `Intl.DateTimeFormat` per `Europe/Rome`, nel modulo di dominio. Suite backend completa dopo questo passo e quello del catalogo: **137/137 test superati**, compresi amministrazione, cancellazione account, occorrenze e statistiche. Non è stata modificata la logica delle fasce o il punto 3.2.

### Passo 6 — Accesso SQLite condiviso nel catalogo: completato, 40%

**Modifiche.** In `backend/routes/catalog.routes.js` sono stati eliminati i wrapper locali Promise `query()` e `get()`; elenco edifici/spazi, ricerca, disponibilità, raccomandazioni e dettaglio usano `queries(getDatabase())` da `backend/db/query.js`. Anche il calcolo dei posti occupati riceve lo stesso adapter. SQL, filtri, paginazione e JSON delle risposte restano invariati.

**Verifiche.** Il test HTTP mirato del catalogo era verde prima e dopo la modifica (**3/3**). La suite backend completa è verde (**137/137**), incluse disponibilità, posti occupati, ricerca e prenotazioni. Sintassi del file verificata. Nessun database operativo, file caricato o frontend è stato modificato. Prossimo passo: centralizzare soltanto la paginazione equivalente, poi migrare i wrapper delle segnalazioni in una modifica separata. La tranche 1 resta parziale.

### Passo 7 — Paginazione equivalente condivisa: completato, 45%

**Modifiche.** `backend/http/pagination.js` contiene la regola comune per `page`, `size` e `offset`: valori predefiniti 1/20, dimensione massima 100, errore `400 VALIDATION_ERROR` con lo stesso messaggio. Catalogo, prenotazioni, segnalazioni, tre liste admin, preferiti e notifiche usano questa funzione. `invalidPagination()` resta disponibile al catalogo per gli altri filtri che già condividevano lo stesso errore. I validatori degli ID e delle date non sono stati accorpati: hanno messaggi o semantiche differenti.

**Verifiche.** Il nuovo `backend/test/pagination-http.test.js` controlla via HTTP le cinque liste utente e le tre liste admin con pagina zero, pagina decimale e dimensione eccessiva, usando account e database temporanei: **2/2 test superati**. La suite backend completa passa **139/139** test. Controlli sintattici e `git diff --check` superati. L'ordine, le risposte JSON e la logica dei filtri delle liste non sono stati modificati. Prossimo passo: sostituire i wrapper Promise locali delle segnalazioni con l'adapter condiviso e verificare foto, elenco e creazione senza anticipare la sostituzione del parser multipart.

### Passo 8 — Accesso SQLite condiviso nelle segnalazioni: completato, 50%

**Modifiche.** `backend/routes/reports.routes.js` usa `queries(getDatabase())` da `backend/db/query.js` per elenco, conteggio, foto, dettaglio e verifica dello spazio in creazione. Sono stati tolti soltanto i wrapper Promise locali `query()` e `get()`: SQL, autorizzazioni, JSON, transazione di inserimento e parser multipart rimangono invariati. La route D14c di dettaglio è ancora presente; la sua rimozione resta nel passaggio dedicato della tranche 4.

**Verifiche.** Il nuovo `backend/test/reports-http.test.js`, verde sia prima sia dopo la modifica (**3/3**), copre elenco paginato, creazione con e senza foto, BLOB PNG, lettura della foto, isolamento fra utenti, `401` e `403`. La suite backend completa dopo tutti i passi della sessione passa **142/142** test. I test Angular mirati su mappa, API e pagine delle segnalazioni passano **17/17** controlli. Sintassi dei file coinvolti e `git diff --check` superati.

**Chrome con dati isolati.** Dal server locale in Google Chrome sono riusciti login, apertura dell'edificio e dello spazio dalla mappa, invio di una segnalazione senza foto e comparsa nell'elenco «Le mie segnalazioni» con descrizione e conteggio corretti. I server di prova sono stati fermati e il database temporaneo eliminato. Non sono stati modificati database operativo, foto esistenti, frontend o punto 3.2.

**Stato al 50%.** Tranche 0 conclusa; tranche 1 avanzata ma ancora parziale: D3 resta soprattutto in utenti e amministrazione, mentre D4 ha solo la paginazione equivalente accorpata. La conversione D5 è centralizzata. Tranche 2–7 e D14c–D14e restano da svolgere nei rispettivi passi. Prossimo intervento consigliato: migrare l'accesso SQLite di `users.routes.js` con test di profilo/foto, poi trattare una famiglia admin per volta. Nessuna modifica di questo 50% resta non verificata o non documentata.

### Passo 9 — Foto profilo separate in route, controller e model: completato, 55%

**Modifiche.** `backend/routes/users.routes.js` dichiara i percorsi e i middleware per `GET`, `PUT` e `DELETE /users/me/photo`; `backend/controllers/users.controller.js` gestisce lettura del file, errori e risposte HTTP; `backend/models/users.model.js` contiene le tre query sul profilo tramite l'adapter comune `backend/db/query.js`. `readProfilePhoto()`, cambio password, cancellazione account, limiti e ruoli restano invariati.

**Verifiche.** La suite backend completa passa **142/142** test dopo la modifica, incluso `backend/test/account.test.js`, che copre lettura, sostituzione, cancellazione, utenti e amministratori, formati e dimensioni errati. Controlli sintattici e `git diff --check` superati. L'esecuzione isolata del test HTTP è stata bloccata dall'ambiente (`listen EPERM` su `127.0.0.1`); la suite completa avviata dal comando di progetto ha invece eseguito gli stessi test con successo. Nessun dato operativo o frontend è stato modificato.

**Prossimo passo.** Migrare con prudenza l'accesso SQLite di una famiglia amministrativa piccola, lasciando le transazioni esistenti invariate; documentare e verificare il passo prima di proseguire.

### Passo 10 — Wrapper generici SQLite amministrativi condivisi: completato, 60%

**Modifiche.** `backend/routes/admin.routes.js` non definisce più i propri wrapper Promise `all()` e `get()`. Le letture di riepilogo, edifici, spazi, disponibilità, prenotazioni, segnalazioni e utenti passano attraverso `queries(getDatabase())` in `backend/db/query.js`. Le query SQL, la forma delle risposte, i controlli di ruolo e le transazioni sono rimasti invariati. Gli accessi diretti al driver SQLite in alcuni handler restano da migrare in un passo distinto.

**Verifiche.** La suite backend completa passa **142/142** test dopo la sostituzione, inclusi i casi amministrativi di `backend/test/auth.test.js` e la paginazione di `backend/test/pagination-http.test.js`. Sintassi di `admin.routes.js` e `git diff --check` superati. Nessun dato operativo o frontend è stato modificato.

**Prossimo passo.** Sostituire gli accessi diretti al driver SQLite rimasti nel router amministrativo, senza alterare le transazioni; controllare le chiamate 400/401/403/404 e la suite completa.

### Passo 11 — Accesso SQLite condiviso negli edifici amministrativi: completato, 65%

**Modifiche.** In `backend/routes/admin.routes.js`, lettura del singolo edificio, inserimento e aggiornamento usano l'adapter condiviso. Sono stati rimossi quattro wrapper Promise locali negli handler degli edifici; `lastId` dell'adapter sostituisce il precedente `this.lastID` nella creazione. SQL, validazioni, gestione del conflitto `409`, risposte e cancellazione transazionale restano invariati. Il dettaglio `GET /admin/buildings/:buildingId` esiste ancora: la decisione D14d verrà eseguita in un passaggio dedicato.

**Verifiche.** `backend/test/admin-buildings-http.test.js` usa account e SQLite temporanei e verifica `401`/`403`, creazione, elenco, dettaglio, aggiornamento, conflitto di numero sia in creazione sia in modifica, cancellazione e `404` successivo: **1/1 test mirato superato**. Suite backend completa: **143/143** test superati. Sintassi e `git diff --check` superati. Non è stato toccato il database operativo e non sono stati modificati frontend, foto o transazioni.

**Stato al 65%.** Tranche 0 conclusa; tranche 1 avanzata ma ancora parziale per gli accessi diretti rimasti in admin e account. I moduli pilota preferiti, notifiche e foto profilo sono separati; le tranche 2–7 restano da attuare. Gli handler admin degli spazi e degli utenti contengono ancora accessi diretti al driver; l'elenco utenti richiede un test del totale paginato prima di intervenire sul suo `await getDatabase().get(...)`. Il controllo browser Chrome per l'area admin sarà ripetuto nella tranche pertinente. Nessun intervento del 55–65% resta aperto o privo di test; il prossimo lavoro richiede nuova autorizzazione.

### Passo 12 — Letture degli spazi admin con adapter condiviso: completato, 70%

**Modifiche.** In `backend/routes/admin.routes.js` il totale dell'elenco degli spazi e il dettaglio del singolo spazio usano `queries(getDatabase())` al posto di due Promise costruite sul driver SQLite. SQL, filtri, paginazione, servizi, JSON, controlli di ruolo e gli altri handler degli spazi rimangono invariati.

**Verifiche.** Il nuovo `backend/test/admin-spaces-read-http.test.js` usa SQLite e account temporanei: lista con ricerca e totale paginato, dettaglio e servizi, `400`/`404`, `401`/`403`: **3/3 test mirati superati**. La suite preesistente dopo la modifica passa **143/143** test; sintassi e `git diff --check` superati. Il test separato introdotto subito dopo per D15 fallisce intenzionalmente sulla paginazione admin utenti nel codice ancora non corretto: **1/3 superati, 2/3 falliti**, con `totalElements` assente e `totalPages: null`. Questo fallimento non riguarda gli spazi e sarà corretto nel passo successivo prima della chiusura della sessione.

**Prossimo passo.** Applicare D15 all'elenco utenti admin con lo stesso adapter e verificare nuovamente la suite completa; lasciare inalterati ricerca, ordinamento, autorizzazioni e cancellazione utenti.

### Passo 13 — Totale paginato degli utenti admin corretto: completato, 75%

**Difetto misurato prima della correzione.** Il nuovo `backend/test/admin-users-pagination-http.test.js`, con SQLite e account temporanei, ha mostrato che `GET /api/v1/admin/users` restituiva l'elenco ma ometteva `pagination.totalElements` e riportava `totalPages: null`. Il test iniziale ha superato solo **1/3** controlli; i due fallimenti riguardavano totale e ricerca. La causa era `await getDatabase().get(...)`: il metodo `sqlite3` usa callback e restituisce subito l'oggetto database, non la riga richiesta. Il frontend usa `totalPages` per il pulsante «Successiva».

**Correzione D15.** La lettura del totale in `backend/routes/admin.routes.js` usa ora `database().get(...)`, lo stesso adapter comune già adottato dalle altre letture. SQL, URL, filtri, ordinamento, formato dei dati, permessi e cancellazione utenti restano invariati; il JSON della paginazione contiene i numeri attesi.

**Verifiche.** Il test HTTP dedicato passa **3/3** casi: totale senza filtro, pagina successiva, ricerca filtrata, ricerca vuota e accessi `401`/`403`. La suite backend completa passa **149/149** test; sintassi e `git diff --check` superati. In Google Chrome, usando soltanto un database temporaneo con 24 account di prova, l'area «Gestione utenti» ha mostrato «Pagina 1 di 2», ha aperto «Pagina 2 di 2» con i quattro account restanti e, cercando `utente23`, è tornata a «Pagina 1 di 1». La scheda è stata chiusa, i server fermati e il database temporaneo eliminato. Nessun dato operativo o frontend è stato modificato.

**Stato al 75%.** Tranche 0 conclusa; tranche 1 avanzata ma ancora parziale per gli accessi diretti rimasti. Le tranche 2–7 restano da attuare. Prossimo intervento consigliato: iniziare la separazione della famiglia auth in model dati e controller per passi piccoli, verificando registrazione, login, refresh e logout senza cambiare cookie o limiti. D14c–D14e saranno affrontate nei passaggi previsti. Nessuna modifica del 65–75% resta non verificata o non documentata; attendere una nuova autorizzazione per proseguire.

### Passo 14 — Registrazione con route, controller e model: completato, 80%

**Modifiche.** `backend/routes/auth.routes.js` ora dichiara `POST /register` e mantiene i rate limit e l'header comune; `backend/controllers/auth.controller.js` contiene validazione della richiesta, hash password, risposta ed errore per email già presente; `backend/models/auth.model.js` contiene l'inserimento parametrizzato con `ON CONFLICT(email) DO NOTHING`, usando l'adapter `backend/db/query.js`. Il controllo di `changes` e `lastId` mantiene una sola creazione anche in caso di richieste concorrenti. Login, refresh, logout, cookie e relative protezioni non sono stati modificati.

**Verifiche.** Prima della modifica la suite backend passava **149/149** test; dopo la modifica passa ancora **149/149**, compresi i nove casi di `backend/test/register.test.js` su normalizzazione, campi non validi, ruolo imposto a `user`, email duplicata e concorrenza. I test Angular mirati della pagina di accesso e del servizio auth passano **19/19**. Sintassi dei tre file e `git diff --check` superati. In Google Chrome, con database temporaneo isolato, la registrazione di un account fittizio ha aperto `/login?registered=1` con conferma; il login immediatamente successivo ha aperto `/home` con il nome del nuovo utente. Scheda chiusa, server fermati e database temporaneo eliminato. Nessun dato operativo o frontend è stato modificato.

**Stato all'80%.** Tranche 0 conclusa; tranche 1 ancora parziale per alcuni accessi diretti; tranche 2 avviata con la registrazione completa nella struttura Route → Controller → Model. Login, refresh, logout, `rateLimit()` e `requireCookieRequest()` restano da valutare e separare per piccoli passi, conservando comportamento e sicurezza. Le tranche 3–7 e D14c–D14e restano da svolgere. Nessuna modifica del passo 14 è aperta o priva di verifica; il prossimo lavoro richiede nuova autorizzazione.

### Passo 15 — Login con route, controller e model: completato, 85%

**Modifiche.** `backend/routes/auth.routes.js` dichiara `POST /login` con il rate limit e l'header comune già presenti. `backend/controllers/auth.controller.js` valida email e password, usa l'hash fittizio per un'email inesistente, verifica la password, genera i token e costruisce cookie e risposta. `backend/models/auth.model.js` contiene la lettura dell'utente e l'inserimento condizionato della sessione con l'adapter SQLite comune: l'inserimento resta vincolato a ID, hash password e ruolo correnti. La seconda impostazione di `no-store` nell'handler è stata tolta; l'header comune del router continua ad applicarsi anche al login, come previsto da D12b.

**Verifiche.** Prima e dopo lo spostamento la suite backend completa passa **149/149** test, compresi i casi su credenziali, sessione sostituita, cookie, JWT e accessi protetti. Controllo sintattico dei tre file e `git diff --check` superati. Nessun database operativo o frontend è stato modificato.

**Passo successivo eseguito:** separazione di refresh e logout, descritta nel passo 16.

### Passo 16 — Refresh e logout con route, controller e model: completato, 90%

**Modifiche.** `backend/routes/auth.routes.js` dichiara `POST /refresh` e `POST /logout` con gli stessi middleware `requireCookieRequest` e `cookieParser`. `backend/controllers/auth.controller.js` conserva la validazione del token nel cookie, gli errori distinti `MISSING`, `INVALID`, `EXPIRED` e `SESSION_REPLACED`, la risposta del refresh e il logout `204`. `backend/models/auth.model.js` contiene le query parametrizzate di lettura, rotazione e cancellazione tramite l'adapter comune. L'UPDATE della rotazione conserva tutte le condizioni su hash precedente, JTI, scadenza e ruolo; il nuovo cookie viene emesso solo se cambia una riga. Anche la cancellazione del cookie in logout avviene soltanto se viene eliminata una sessione. Il recupero password, i rate limit e la protezione delle richieste basate su cookie restano invariati.

**Verifiche.** Suite backend completa dopo la modifica: **149/149 test superati**. I test di refresh coprono token mancante, malformato, sconosciuto o scaduto, richieste cross-site, rotazione concorrente, sessione sostituita ed errore SQLite. I test di logout coprono revoca, ripetizione, concorrenza, vecchio cookie dopo refresh ed errore SQLite. I test di login verificano anche `Cache-Control: no-store`, ora impostato una sola volta nel router. Sintassi dei tre file e `git diff --check` superati. In Google Chrome, con un database temporaneo, sono riusciti registrazione, login, apertura del profilo e logout con ritorno alla pagina `/login`. La prova Chrome non ha forzato la scadenza del JWT: la rotazione del refresh è verificata dai test HTTP dedicati. Server fermati, scheda di prova chiusa e database temporaneo rimosso. Nessun database operativo o frontend è stato modificato.

**Stato al 90%.** Tranche 0 conclusa; tranche 1 ancora parziale per gli accessi diretti e i validatori restanti; tranche 2 progredita con registrazione, login, refresh e logout separati. Restano profilo/account non ancora completamente riorganizzati, alcune route amministrative, le tranche 3–7 e le rimozioni D14c–D14e, oltre alla verifica finale. La percentuale è una stima di piano e non significa che il backend sia quasi interamente rifattorizzato. Il prossimo intervento richiede nuova autorizzazione; non c'è lavoro aperto nei passi 15–16.

### Passo 17 — Autenticazione delle richieste e cambio password: completato, 95%

**Modifiche.** `backend/middleware/auth.js` conserva verifica JWT, validazione rigorosa dei claim, `401`, `Cache-Control` e valorizzazione di `request.user`, ma usa `findAuthenticatedUser()` in `backend/models/auth.model.js` per la lettura parametrizzata di utente e sessione. `backend/routes/users.routes.js` dichiara ora `GET /me` e `PATCH /me/password` con i middleware invariati e controller dedicati. In `backend/controllers/users.controller.js` si trovano risposta del profilo, validazione della nuova password, hash, transazione, revoca e risposta `204`. `backend/models/users.model.js` contiene la lettura dell'hash, il controllo della sessione corrente nella transazione e gli aggiornamenti di password/sessioni; `backend/security/account-password.js` mantiene verifica della password corrente, errore `401` per sessione sostituita e pulizia del cookie, riutilizzati anche dalla cancellazione dell'account. Ordine di validazione, messaggi, codici HTTP, cookie, rate limit e condizioni concorrenti restano invariati. La cancellazione dell'account non è stata riorganizzata in questo passo.

**Verifiche per piccoli passi.** Prima delle modifiche la suite backend passava **149/149** test. Dopo l'estrazione della lettura sessione nel model, ancora **149/149**; dopo lo spostamento di profilo e cambio password, di nuovo **149/149**. Sono compresi i casi su claim JWT, ruoli, sessioni revocate, cambio password, due cambi concorrenti, rollback in caso di errore SQLite, cancellazione account e recupero password. Controlli sintattici dei file coinvolti e `git diff --check` superati. In Google Chrome, con database temporaneo, registrazione e login hanno aperto il profilo con nome ed email corretti; il logout ha riportato alla pagina di accesso. Il cambio password è verificato dai test HTTP, non è stato eseguito in Chrome. Scheda chiusa, server fermati e database temporaneo rimosso. Nessun database operativo o frontend è stato modificato.

**Stato al 95%.** Tranche 2 avanzata, ma non conclusa: resta da valutare la collocazione della cancellazione account e del recupero password. Tranche 1 e 3–7, rimozioni D14c–D14e e verifica finale restano aperte. Il 95% è il punteggio del piano per i passi completati e verificati; non rappresenta la percentuale di backend effettivamente rifattorizzato. I cinque punti nominali restanti non sono proporzionati alla quantità di lavoro aperto: prima di assegnare il 100% sarà necessario rivedere i pesi o esplicitare nuovi passi. Il prossimo intervento richiede nuova autorizzazione; questo passo non lascia modifiche non verificate.

### Passo 18 — Recupero password separato: completato, senza nuovi punti percentuali

**Modifiche.** `backend/routes/auth.routes.js` mantiene soltanto middleware, limiti e percorso `POST /forgot-password`; `backend/controllers/auth.controller.js` esegue validazione, risposta uniforme `204`, risposta `429` della coda e pulizia del cookie. `backend/security/recovery.js` conserva SMTP, coda, password casuale e transazione, ma usa tre funzioni di `backend/models/auth.model.js` per la lettura dell'account, la verifica dell'hash corrente e l'aggiornamento di password/sessioni. L'invio email resta nella stessa transazione, con rollback se fallisce. Nessun contratto API è stato modificato.

**Verifiche.** Suite backend completa dopo questo passo: **150/150 test superati**; sono inclusi SMTP TLS, risposta uniforme per email sconosciuta, revoca dei token e rollback su errore SMTP. Controlli sintattici dei quattro file e `git diff --check` superati. Il conteggio dei test è salito da 149 a 150 perché altre tranche indipendenti sono in corso nella checkout condivisa. Nessun frontend o database operativo è stato modificato in questo passo.

**Prossimo passo in corso.** Separare le query e la risposta HTTP della cancellazione account mantenendo transazione, notifiche e coda di pulizia foto. Le tranche 3–6 sono svolte in parallelo su file distinti; ciascun esito sarà documentato dopo la verifica.

### Passo 19 — Cancellazione account: completato, senza nuovi punti percentuali

**Modifiche.** La route `DELETE /users/me` chiama il controller in `backend/controllers/users.controller.js`; il servizio `backend/security/delete-account.js` conserva la transazione, il consolidamento, le notifiche, la coda di pulizia foto e il trattamento degli errori; `backend/models/users.model.js` contiene le query relative. Cookie e risposta `204` sono ora nel controller. Il test di cancellazione con rollback, prenotazioni, notifiche e foto ha superato i controlli applicativi.

**Verifica.** Dopo l'aggiornamento dell'helper esclusivo dei test, `node --test test/account.test.js` ha superato **10/10** casi e il teardown: cambio password, recupero SMTP, cancellazione con prenotazioni/notifiche/foto e rollback su errore. Resta la verifica dell'intera suite integrata dopo le tranche parallele; questo passo, preso singolarmente, è concluso.

### Integrazione parallela — stato intermedio del 13 ottobre 2026

- **Tranche 3, in corso:** catalogo e prenotazioni sono stati separati in nuovi file, e i test della famiglia erano verdi. La revisione del coordinatore ha però rilevato che i nuovi file route montavano router definiti nei controller e i model esponevano soltanto l'adapter: questa separazione non soddisfa ancora Route → Controller → Model. È in corso la correzione con route dichiarative e query nominate nei model. Non conteggiare conclusa la tranche.
- **Tranche 4, in corso:** parser manuale sostituito con Multer, test aggiunti e D14c rimossa. La prima versione installata era `multer@2.0.2`; il changelog ufficiale documenta correzioni successive. È in corso l'aggiornamento a una versione corretta e la separazione reale dei restanti handler. La verifica integrata va ripetuta dopo il cambiamento.
- **Tranche 5, in corso:** edifici e utenti amministrativi sono stati estratti; D14d e D14e sono state rimosse e verificate, conservando le altre operazioni. Restano le famiglie amministrative spazi, disponibilità, avvisi, prenotazioni, segnalazioni e statistiche. Non conteggiare conclusa la tranche.
- **Tranche 6, in corso:** `knownPrefixes` è stato rimosso; occorrenze e statistiche sono state suddivise in funzioni più leggibili, con suite backend inizialmente verde **150/150**. `stopServer()` e gli handler personalizzati dei segnali sono stati rimossi da `server.js`; un helper esclusivo dei test sta sostituendo i vecchi import. La suite integrata è temporaneamente non valida finché tutti i test non usano il nuovo helper.

**Regola per il 100%.** Il vecchio punteggio 95% non viene incrementato meccanicamente: il completamento finale usa i sei criteri della sezione 3 e tutte le tranche 0–7, ciascuna verificata. L'esito e i limiti delle verifiche sono registrati nel passo 26.

### Passo 20 — Segnalazioni e foto: modifica mirata verificata, integrazione conclusa nel passo 26

**Modifiche.** Il parser multipart scritto a mano è stato sostituito con `multer@2.4.0`, dopo controllo del [changelog ufficiale](https://github.com/expressjs/multer/blob/main/CHANGELOG.md). Multer è un middleware Express che gestisce `multipart/form-data`, file opzionale e limiti configurabili senza mantenere nel progetto un parser manuale. Route, controller e model delle segnalazioni hanno responsabilità distinte e query nominate. La route D14c (`GET /reports/:reportId`) è stata rimossa; lista, creazione e foto rimangono. Sono mantenuti il limite foto di 5 MiB, il controllo dei byte effettivi JPEG/PNG/WebP, i file opzionali e la lettura sia da BLOB sia da file storici. La revisione rispetto al vecchio parser ha aggiunto limiti di campo (64 KiB), numero di campi (2), file (1) e parti (3); gli errori per richieste troppo grandi e formati non accettati restano espliciti.

**Verifiche.** I test HTTP isolati `backend/test/reports-http.test.js` hanno superato **4/4** casi, compresi file oltre limite, campi/parti eccessivi, multipart malformato, autorizzazione, foto BLOB e 404 della route rimossa. Sintassi e `git diff --check` superati. La suite integrata e il flusso browser pertinente sono registrati nel passo 26.

### Passo 21 — Ciclo del server e 404: modifica mirata verificata, integrazione conclusa nel passo 26

**Modifiche.** `backend/server.js` conserva `startServer()` ma non espone più `stopServer()` o `shutdown()` e non registra handler personalizzati dei segnali. Il timer delle occorrenze viene cancellato quando il listener emette `close`; un'attesa delle eventuali operazioni già avviate è usata dall'helper esclusivo dei test prima di chiudere SQLite. I test HTTP non amministrativi usano tale helper. Il router API non usa più `knownPrefixes`.

**Verifiche.** Aggiunti controlli per i percorsi API sconosciuti, per il `Cache-Control: no-store` del login e per la cancellazione del timer alla chiusura. Il test isolato di account, che usa il nuovo helper, ha superato **10/10** casi. Una suite intermedia durante il refactoring amministrativo aveva **152/158** test superati: i sei fallimenti erano nei teardown di tre file admin ancora importatori di `stopServer()`. Quei file sono stati adattati e la suite finale è verde (passo 26).

### Passo 22 — Catalogo e prenotazioni: modifica mirata verificata, integrazione conclusa nel passo 26

**Modifiche.** Le route di catalogo e prenotazioni dichiarano URL e middleware e richiamano controller nominati. I controller gestiscono richiesta, validazione, transazioni e risposta; le query sono funzioni nominate in `backend/models/catalog.model.js` e `backend/models/bookings.model.js`. `qualifyingSpaces()` è divisa in passaggi nel servizio catalogo, con accesso dati demandato al model. Sono preservati filtri, capienza, partecipanti, disponibilità e idempotenza.

**Verifiche.** Sintassi e `git diff --check` superati; test mirati di catalogo e prenotazioni **7/7** superati. Un gruppo più ampio aveva ottenuto **13/14** durante la riorganizzazione amministrativa: l'unica verifica fallita riguardava la route admin delle indisponibilità. La regressione è stata corretta; suite integrata e prova Chrome finali sono nel passo 26.

### Passo 23 — Area amministrativa e integrazione delle tranche: test backend completi

**Modifiche.** `backend/routes/admin.routes.js` ora dichiara soltanto percorsi, permessi e controller. `backend/controllers/admin.controller.js` gestisce input, transazioni e risposte; `backend/services/admin.service.js` organizza le regole collegate; `backend/models/admin.model.js` contiene le query per edifici, spazi, disponibilità, indisponibilità, avvisi, prenotazioni, segnalazioni e utenti. D14d e D14e sono rimosse, senza togliere i metodi di modifica/cancellazione sugli stessi percorsi. I tre test HTTP admin usano l'helper di chiusura del listener e del database, dopo la rimozione di `stopServer()`. La regressione temporanea sulle indisponibilità retrodatate è stata corretta.

**Verifica integrata.** `npm test` nel backend: **152/152 superati** dopo le tranche 3–6 e la correzione admin; sono compresi migrazioni, seed, autenticazione, ruoli, prenotazioni e partecipanti, timer, disponibilità, statistiche, report e cinque route GET rimosse. La compilazione del frontend con `npm run build` è riuscita; rimangono avvisi su dimensioni SCSS, browser datati e due dipendenze CommonJS, senza errori di build. `npm ls multer --depth=0` conferma `2.4.0`; nessuna query SQL risulta in `backend/routes/`, `backend/controllers/` o `backend/services/`; non risultano riferimenti a `stopServer`, `shutdown` o `knownPrefixes` nel codice backend. `git diff --check` superato. I controlli successivi sono registrati nei passi 24–26.

### Passo 24 — Wrapper SQLite ausiliari: completato, verifica integrata ripetuta

**Modifiche.** Anche `backend/db/db.js`, `backend/db/migrate.js` e `backend/db/seed.js` usano l'adapter `backend/db/query.js` per le operazioni equivalenti `get`, `run` e `all`. Le operazioni `open`, `exec` e `close` restano locali perché hanno responsabilità diverse. Migrazioni, seed e transazioni mantengono ordine, rollback e vincoli esistenti.

**Verifiche.** Su database temporaneo: prima migrazione applica le versioni 1–8, seconda migrazione non applica nulla; primo seed crea amministratore e servizi, secondo seed non duplica i dati. Controllo sintattico e `git diff --check` superati. Ho ripetuto personalmente l'intera suite dopo la modifica: **152/152 test backend superati**. D3 è ora attuato anche negli script di database; restano da concludere l'audit dei validatori equivalenti D4 e i flussi Chrome finali.

### Passo 25 — Validazioni equivalenti: completato, verifica integrata ripetuta

**Modifiche.** `backend/http/validation.js` contiene la regola condivisa per ID testuali positivi, usata dai controller di prenotazioni, catalogo, preferiti, notifiche e segnalazioni con codici e messaggi propri di ciascuna risorsa. `backend/domain/time.js` contiene la validazione pura della data ISO reale, riutilizzata dove le regole coincidono in catalogo, prenotazioni, servizio amministrativo e statistiche. Le conversioni specifiche del fuso Europe/Rome e il calcolo del giorno della settimana restano nelle responsabilità appropriate. La paginazione era già condivisa in `backend/http/pagination.js`.

**Differenze conservate.** Gli ID in alcune operazioni amministrative usano storicamente la coercizione numerica; accorparli con la regola testuale rigorosa cambierebbe i codici o i casi accettati, quindi non sono stati modificati. Due controlli brevi sull'ordine degli orari rimangono locali perché un helper aggiungerebbe complessità. Non sono stati introdotti cambiamenti da `404` a `400` senza decisione dell'utente.

**Verifiche.** Tre test unitari nuovi coprono ID, data reale, anni a quattro cifre e predicato booleano; i test mirati complessivi hanno superato **10/10**. Ho ripetuto l'intera suite dopo D4: **155/155 test backend superati**, sintassi e `git diff --check` superati. Resta la verifica Chrome finale prima di dichiarare chiuso il piano.

### Passo 26 — Verifica finale e chiusura del piano: 100%

**Esito tecnico.** Dopo il passo 25 e un'ultima pulizia di import, `npm test` nel backend ha superato **155/155** test. `npm run build` del frontend è riuscito. `npm ls multer --depth=0` conferma la versione `2.4.0`; controllo sintattico e `git diff --check` superati. La ricerca nel codice backend non trova SQL in route, controller o servizi applicativi e non trova più `stopServer`, `shutdown()` o `knownPrefixes`. I wrapper SQLite equivalenti sono condivisi; gli ID e le date con regole davvero comuni usano helper comuni. I controlli di sicurezza, le transazioni e i risultati delle statistiche restano coperti dai test.

**Verifica in Google Chrome con dati isolati.** Sono riusciti login utente e admin tramite il proxy locale `/api`, catalogo con tre spazi, dettaglio e disponibilità di uno spazio, creazione della prenotazione con conferma e comparsa nell'area admin, creazione di una segnalazione senza foto con comparsa nell'area admin, e caricamento dei pannelli admin di spazi, disponibilità, statistiche, utenti, segnalazioni e prenotazioni. È stato aperto e annullato il dialog di eliminazione utente; nessun utente è stato eliminato nella prova. I server di test sono stati fermati e il database demo e la cartella upload temporanea sono stati rimossi. Il database operativo non è stato usato nei test.

**Copertura e limiti delle prove.** L'invio e la lettura di una foto sono stati verificati nei test HTTP automatizzati; nel flusso Chrome è stata inviata una segnalazione senza allegato. Non è stato disponibile un controllo esplicito del viewport mobile nella sessione Chrome finale; la build frontend è riuscita e questa verifica responsive non fa parte delle modifiche backend del presente piano. La prova con rete esterna non è stata eseguita, perché il perimetro del progetto prevede il server locale.

**Criteri della sezione 3:** 1) tutte le famiglie hanno route dichiarative e query separate; 2) accesso SQLite, paginazione, validazioni equivalenti e orario italiano sono condivisi; 3) foto con Multer e controlli su limite/formato/autorizzazione; 4) login, rinnovo, ruoli, prenotazioni, disponibilità, foto e statistiche coperti da suite e flussi pertinenti; 5) D14a–D14e hanno decisioni esplicite e test 404, mantenendo API ancora usate dal frontend; 6) tranche verificate singolarmente e nuovamente nella suite integrata, con flussi Chrome finali. **Tutti i sei criteri e le tranche 0–7 sono chiusi: 100% del perimetro concordato.** Il vecchio 95% era un punteggio intermedio non proporzionato al lavoro restante; questo 100% indica l'effettiva chiusura dei criteri, non una semplice aggiunta di cinque punti.

## 10. Mappa per la spiegazione in Visual Studio Code

Partire da `backend/app.js` e `backend/routes/api.routes.js` per mostrare come Express monta le famiglie di URL. Aprire `backend/server.js` soltanto per spiegare l'avvio, il collegamento SQLite e il timer delle occorrenze. Per la sicurezza mostrare `backend/middleware/auth.js`, `backend/middleware/rate-limit.js` e `backend/middleware/cookie-request.js`. Per una famiglia completa e semplice aprire, nell'ordine, `backend/routes/favorites.routes.js`, `backend/controllers/favorites.controller.js`, `backend/models/favorites.model.js` e `backend/db/query.js`. Le altre famiglie seguono la stessa organizzazione in `routes/`, `controllers/` e `models/`; prenotazioni e disponibilità aggiungono `backend/db/transaction.js`, mentre le statistiche usano `backend/db/statistics.js` e `backend/db/occurrences.js`.

**Esempio da raccontare:** il client invia `POST /api/v1/favorites/4`. `app.js` passa la richiesta al router API, che la indirizza a `favorites.routes.js`. `requireAuth` verifica token e sessione; `requireRole("user")` controlla il ruolo. `favorites.controller.js` valida l'ID e verifica lo spazio, poi chiama la funzione del model che esegue l'`INSERT` parametrizzato tramite l'adapter SQLite condiviso. Il controller costruisce una risposta JSON con `spaceId: 4` e `isFavorite: true`, usando `201` per un nuovo preferito e `200` se era già presente. Errori e URL inesistenti passano per i middleware centrali. Questo esempio rende visibile il percorso richiesto dalle slide: **Client → Route → Middleware → Controller → Model → SQLite → Response**.
