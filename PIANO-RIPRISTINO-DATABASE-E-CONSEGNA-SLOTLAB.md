# Piano di ripristino del database e verifica della consegna SlotLab

**Data:** 29 ottobre 2026.
**Stato:** IN ESECUZIONE — autorizzato dall’utente il 29 ottobre 2026.
**Avanzamento dell'esecuzione:** 95% — correzione collaudata e pubblicata su Finale; resta la conferma ARM del collega per la chiusura.
**Progetto:** `/Users/Shared/Programmazione Web e Mobile/SlotLab`.
**Branch di destinazione:** `Finale` del repository `PokeManu/SlotLab`; riferimento remoto verificato il 29 ottobre 2026: `d75fd757ef710e8eaf78cb98e3d7d8cd04f34220`. Ricontrollare il riferimento prima dell'integrazione e del push.
**Ultimo aggiornamento del piano:** confronto con il branch `Finale`, pubblicato dal collega a partire dalla copia ricevuta su WhatsApp.
**Obiettivo:** rendere avviabile la copia completa del sito preservando i dati esistenti, produrre una consegna ZIP verificata e riproducibile e integrare le correzioni collaudate sul branch `Finale`, mantenendo il lavoro del collega.

## 1. Autorizzazione e limiti

L'utente ha approvato l'esecuzione dell'intero piano il 29 ottobre 2026, dopo il confronto con Finale. I limiti seguenti descrivono la precedente fase di pianificazione e le condizioni per la pubblicazione. Prima del suo ok all'esecuzione non si modificano codice, configurazioni, database, migrazioni, dipendenze o archivi di consegna e non si avviano server; non si effettuano commit, cambi di branch, merge o push nel repository del progetto. L'unico file creato o aggiornato nel progetto durante la pianificazione è questo Markdown. La destinazione richiesta per la futura pubblicazione è `Finale`, dopo la riuscita delle verifiche descritte nel piano.

Le istruzioni della cartella padre sono state lette. `SlotLab/AGENTS.md` non risulta presente al momento della pianificazione; ricontrollarlo prima dell'esecuzione. Preservare tutte le modifiche locali e i materiali ufficiali. Non iniziare il punto 3.2 citato nelle istruzioni della cartella padre. Nessun worktree e nessuna riorganizzazione generale del frontend o del backend: limitarsi al ripristino, alle verifiche e alla consegna. Sono previste copie di sicurezza e una cartella temporanea di estrazione per il collaudo dello ZIP, senza creare un progetto di sviluppo alternativo.

Usare subagents, quando utile, per revisione indipendente della diagnosi, dei test e della consegna; un solo responsabile modifica il database o i file di migrazione. Usare Google Chrome per le verifiche del sito.

## 2. Problemi osservati e aspetti ancora da accertare

### Riscontri confermati

- Il collega ha ricevuto uno ZIP contenente un modulo nativo SQLite `x86_64`, incompatibile con il processo Node ARM del suo Mac. Dopo la reinstallazione delle dipendenze, il caricamento del modulo non è più il blocco riportato.
- `npm start` nel backend carica `.env` ed esegue `server.js`. Il semplice `node server.js` non include il caricamento esplicito di `.env` previsto dallo script.
- Il backend si ferma con: `La migrazione 1 e stata modificata dopo l'applicazione.`
- Il confronto in `backend/db/migrate.js` verifica SHA-256 del contenuto dei file contro i valori registrati in `schema_migrations`.
- La stessa discordanza è stata riscontrata con accesso in sola lettura nel database della cartella sul Mac del mittente: non è necessario ipotizzare una modifica fatta dal collega.
- L'impronta attuale di `backend/db/schema.sql` è `4a5ecd247b72a77f29d72136b3e477134768518a9e81eace5d3faf1645c3b1c9`; quella registrata per la versione 1 è `39c6cee644eaca94c4b62d1366c8e1ae2531708c0afbf3b03f8cf5d9abbdaa7a`.
- Nella lettura preliminare, sia `database.sqlite` sia `initial.sqlite` registrano le versioni 1–6; il codice contiene otto migrazioni. Occorre verificare tutte le versioni già applicate e l'aggiornamento alle successive, senza fermarsi alla prima discordanza.
- Le prove automatizzate esistenti costruiscono anche database usando i file SQL correnti: da sole non dimostrano la compatibilità con il database storico ricevuto dal collega.

### Confronto con il branch `Finale` — 29 ottobre 2026

Il collega ha confermato di avere caricato la cartella ricevuta su WhatsApp. Il controllo remoto è stato svolto in un archivio Git temporaneo senza checkout di sviluppo, senza modificare la cartella del progetto né il branch remoto.

- Repository remoto: `https://github.com/PokeManu/SlotLab.git`.
- Branch: `Finale`; commit `d75fd757ef710e8eaf78cb98e3d7d8cd04f34220` (`d75fd75`), messaggio `Modifiche finali`, 29 ottobre 2026 alle 17:41:43, ora italiana. Il suo genitore corrisponde al commit `5c695c6` su cui è basata la copia locale.
- Il confronto dei file pertinenti, esclusi dipendenze installate, database, upload e documenti binari, trova **355 file identici**, nessun file pertinente presente soltanto sul remoto e quattro file diversi: `package.json`, `package-lock.json`, `backend/package.json`, `backend/package-lock.json`. Il codice applicativo frontend/backend e i file SQL confrontati coincidono. Questo confronto non costituisce un test di esecuzione e non certifica gli elementi esclusi.
- Il solo file pertinente presente esclusivamente in locale è il presente piano. Sul branch remoto risultano già incluse le revisioni applicative che nella copia locale sono ancora modifiche non registrate.
- Nei manifest di `Finale`, i pacchetti principali Angular passano da `22.0.1` a `^22.2.3`; CLI e build sono `^22.2.5`, compiler-cli è `^22.2.3`. Nodemailer passa da `10.0.0` a `^10.3.1`. Sono presenti anche autorizzazioni di script d'installazione nel manifest frontend e lockfile aggiornati. Non assumere che tutte le versioni siano uniformi o compatibili: accertare le versioni effettive del lockfile e verificarne installazione, test e build.
- `backend/node_modules` contiene **1.974 file tracciati** sul branch, malgrado la regola di esclusione presente in `.gitignore`. Vanno rimossi dal controllo versione nella fase autorizzata, preservando i file locali necessari. Nel remoto non è stato trovato il binario SQLite del primo errore: il conflitto Intel/ARM è documentato nello ZIP originale e non va attribuito senza prove allo stesso binario nel branch. Resta necessario evitare la distribuzione di dipendenze già installate.
- `backend/db/initial.sqlite` è versionato ed è identico allo snapshot locale con la discordanza registrata. `backend/db/database.sqlite` è escluso da Git e non è presente su `Finale`; non è presente neppure `backend/.env`, mentre è presente `.env.example`. Scaricare il branch non restituisce automaticamente gli stessi dati e la stessa configurazione dello ZIP originale.
- La copia locale è sul branch `main`; il controllo preliminare registra **196 file modificati, 21 eliminati e 61 voci non tracciate**. Questi numeri descrivono lo stato locale al controllo e vanno aggiornati prima di intervenire. Una differenza rispetto a `main` non significa che quel lavoro manchi da `Finale`.

**Conseguenza operativa:** usare `Finale` come riferimento per l'integrazione e preservare i suoi aggiornamenti di dipendenze finché non emergano incompatibilità dimostrate. Non caricare indiscriminatamente l'intera cartella locale su `Finale`, non scartare le modifiche locali e non ripristinare automaticamente i vecchi manifest. Definire separatamente il database operativo conservato, lo snapshot pubblicato e il database incluso nello ZIP.

### Da non dare per acquisito

- Un checksum diverso non prova che il database sia corrotto: possono essere cambiati struttura SQL, commenti, formattazione o terminatori di riga.
- Non è ancora accertata la causa precisa della divergenza né l'equivalenza delle strutture.
- L'avvio del frontend non dimostra il funzionamento del backend, del login o delle altre API.
- Creare un database nuovo non risolve la compatibilità del database esistente e non ne trasferisce i dati.
- Un test locale su una sola architettura non certifica un avvio realmente eseguito sul Mac ARM del collega.

## 3. Regole per la correzione

1. Conservare utenti, credenziali memorizzate, edifici, spazi, disponibilità, prenotazioni, partecipanti, segnalazioni, notifiche, preferiti, foto e relativi collegamenti. Inventariare le ulteriori tabelle effettivamente presenti.
2. Non cancellare il database e non sostituirlo con uno vuoto come soluzione al problema segnalato.
3. Non riscrivere indiscriminatamente i checksum, non eliminare `schema_migrations` e non disabilitare il controllo per far passare l'avvio.
4. Distinguere l'eventuale recupero del testo SQL storico originale, dimostrato e verificato, dall'introduzione di nuove modifiche strutturali, che richiedono una migrazione successiva esplicita.
5. Se un caso storico richiede una riconciliazione dedicata, definirne condizioni precise e verificabili, transazione, rollback e prove. Non accettare genericamente qualsiasi checksum diverso. Scegliere l'intervento più semplice giustificato dalla diagnosi; evitare nuovi meccanismi generali non necessari.
6. Provare prima ogni operazione su una copia consistente del database; applicarla alla copia di riferimento solo dopo le verifiche. Non usare il seed per riparare dati già presenti.
7. Distinguere le trasformazioni dovute alle migrazioni da quelle già previste dal normale avvio, per esempio il consolidamento delle occorrenze: un cambiamento atteso va spiegato, non contato come perdita o ignorato.
8. Preservare sia il lavoro locale sia quello pubblicato su `Finale`. Prima di qualsiasi passaggio di branch predisporre un salvataggio recuperabile anche dei file non tracciati e dei materiali ignorati necessari; niente checkout forzati, reset distruttivi o pulizie indiscriminate.
9. Pubblicare soltanto file selezionati e verificati, dopo revisione del diff. Escludere dipendenze installate, backup, dati operativi e segreti; lo snapshot eventualmente versionato va verificato e trattato come materiale di consegna esplicito. Non usare staging indiscriminato né force push.
10. Se il collega aggiorna `Finale` durante il lavoro, leggere le nuove modifiche, integrarle e ripetere le verifiche interessate prima di pubblicare. Il push deve avanzare normalmente il branch e preservarne la storia.

## 4. Fasi, checkpoint e pesi

Le percentuali rappresentano traguardi verificati del presente piano, non percentuali di codice scritto. Aggiornare il registro dopo ogni piccolo intervento completo, indicando evidenze, limiti e prossimo passo. Non superare il perimetro autorizzato né dichiarare un traguardo solo perché un comando è stato lanciato.

### Fase A — Inventario e recuperabilità: 0–10%

- Rileggere le istruzioni applicabili e fotografare le modifiche locali senza ripristinarle.
- Ricontrollare il commit remoto di `Finale`, aggiornare il confronto e predisporre un salvataggio recuperabile delle modifiche locali, inclusi file non tracciati e configurazioni/dati ignorati necessari. Definire il modo di integrare la correzione nella storia di `Finale` senza sovrascrivere la copia locale e senza creare worktree.
- Identificare manifest e lockfile di `Finale` come riferimento della consegna; non confondere il diff locale rispetto a `main` con le differenze effettive rispetto a `Finale`.
- Individuare il percorso database realmente selezionato dalla configurazione e gli eventuali riferimenti assoluti non portabili, senza pubblicare chiavi o password.
- Identificare database operativo, snapshot, upload, foto e altri file necessari a conservare i dati della consegna.
- Predisporre backup SQLite consistente e ripristino documentato. Se il database è aperto, usare il meccanismo di backup SQLite o fermare in modo controllato il processo: non copiare soltanto il file principale ignorando eventuali WAL/SHM.
- Registrare `PRAGMA integrity_check`, `PRAGMA foreign_key_check`, conteggi delle tabelle, impronte dei file SQL e situazione iniziale dei dati. Per i dati esistenti usare anche confronti di contenuto o impronte deterministiche: i soli conteggi non bastano a dimostrare che i record siano invariati. Non riportare dati personali nei log.

**Criterio del 10%:** backup utilizzabile, percorsi accertati e quadro iniziale documentato; nessuna correzione applicata.

### Fase B — Diagnosi completa delle divergenze: 10–30%

- Confrontare tutte le migrazioni già registrate, non soltanto la numero 1.
- Ricercare versioni storiche disponibili dei file SQL e verificare se producono esattamente le impronte memorizzate. La cronologia o gli archivi sono strumenti di analisi interni, non un obbligo per l'utente di lavorare con Git.
- Confrontare struttura effettiva, colonne, tipi, valori predefiniti, vincoli CHECK/UNIQUE, chiavi esterne, indici e trigger con il percorso di migrazione previsto.
- Distinguere differenze testuali da differenze strutturali; non usare una semplice rimozione degli spazi come prova di equivalenza SQL.
- Valutare l'effetto delle migrazioni 7 e 8 sui dati storici e gli eventuali altri blocchi nascosti dal primo errore.
- Scrivere nel piano la causa dimostrata e la correzione scelta, indicando i file coinvolti e perché preserva i dati. Se le evidenze non consentono una riparazione sicura, documentare l'impedimento prima di qualunque intervento irreversibile.

**Criterio del 30%:** spiegazione della causa sostenuta da confronti ripetibili e strategia di ripristino definita.

### Fase C — Correzione e conservazione dei dati: 30–50%

- Applicare la soluzione scelta su una copia consistente del database storico.
- Se si recuperano migrazioni storiche originali, controllare che i loro checksum corrispondano e che l'intero percorso funzioni anche partendo da zero.
- Se servono modifiche strutturali, introdurle come aggiornamenti espliciti con gestione dell'errore e preservazione dei collegamenti.
- Conservare il rifiuto delle migrazioni alterate non riconosciute.
- Eseguire le migrazioni successive e confrontare dati, integrità e relazioni con la situazione iniziale. Verificare i BLOB e la corrispondenza con eventuali file di foto.
- Solo dopo l'esito positivo, applicare la procedura documentata al database destinato alla consegna e alla copia locale di riferimento, con backup e rollback disponibili. Trattare `initial.sqlite` secondo il suo ruolo accertato: non distribuirlo come snapshot compatibile senza verificarlo.

**Criterio del 50%:** il database esistente completa l'aggiornamento senza perdere dati e la procedura è ripetibile e recuperabile.

### Fase D — Test mirati e regressione: 50–65%

- Database nuovo: applicazione di tutte le migrazioni previste, poi seconda esecuzione senza riapplicazioni.
- Database storico: usare una fixture stabile che riproduca le versioni realmente consegnate, non una fixture rigenerata soltanto dai file attuali.
- Verificare conservazione dei dati e avanzamento dello storico migrazioni.
- Caso negativo: una migrazione con modifica non riconosciuta deve continuare a essere rifiutata.
- Caso di errore: nessuna modifica parziale alla singola migrazione; chiarire quali aggiornamenti precedenti restano applicati e come riprendere l'operazione.
- Eseguire i test backend pertinenti e poi la suite backend per le regressioni legate a schema, autenticazione e dati. Eseguire verifiche frontend aggiuntive solo se i file coinvolti o le evidenze lo richiedono.
- Installare e verificare le dipendenze descritte dai manifest e lockfile di `Finale`, accertando la compatibilità con la versione Node effettiva. Mantenere gli aggiornamenti del collega se funzionano; qualsiasi aggiustamento indispensabile deve essere motivato e applicato coerentemente a manifest e lockfile.
- Poiché `Finale` aggiorna Angular, eseguire anche i test frontend, lint e build sulla combinazione di dipendenze destinata alla pubblicazione. Documentare errori e avvisi separatamente; non riportare come valide le sole prove svolte con i vecchi manifest locali.
- Non usare i database operativi come bersaglio dei test automatici.

**Criterio del 65%:** prove pertinenti superate, numero ed esito riportati, controllo delle migrazioni ancora efficace.

### Fase E — Consegna portabile e istruzioni: 65–80%

- Preparare una procedura documentata per creare lo ZIP dalla versione candidata all'integrazione su `Finale`, preservando i materiali della cartella originale. Registrare il riferimento Git e le eventuali modifiche non ancora registrate associate alla prova.
- Rimuovere dal controllo versione i file già tracciati in `backend/node_modules` senza una cancellazione indiscriminata dei file locali; verificare che le regole di esclusione coprano entrambe le cartelle di dipendenze e che nessun modulo installato resti nel candidato alla pubblicazione.
- Escludere dall'archivio le `node_modules` sia del frontend sia del backend, cache e file temporanei non necessari; non trasferire moduli nativi Intel su ARM.
- Includere sorgenti, manifest e lockfile, tutti i file SQL, database verificato e risorse necessarie ai dati consegnati. Non usare un'esportazione che perda i file locali non ancora tracciati.
- Evitare di dipendere da percorsi assoluti del Mac del mittente o da file mancanti dopo l'estrazione.
- Fornire un modello `.env` completo e istruzioni per generare la chiave JWT sul computer destinatario. Non inserire chiavi o password SMTP del mittente nella guida o nello ZIP. Spiegare le eventuali conseguenze del cambio di chiave sulle sessioni, mantenendo gli account.
- Scrivere istruzioni distinte per: installazione da ZIP con database incluso; scaricamento del branch `Finale`, che non contiene il database operativo; installazione nuova senza database; successivi avvii ordinari. Precisare quando usare lo snapshot verificato `initial.sqlite` e quando preparare un database nuovo, senza sovrascrivere database già esistenti. Nel caso con dati esistenti non richiedere seed o reset non necessari.
- Distinguere esplicitamente i dati operativi conservati sul Mac dal materiale da pubblicare su GitHub: non aggiungere automaticamente `database.sqlite` o `.env` al branch per rendere il download uguale allo ZIP. Lo snapshot previsto dalla consegna deve essere coerente, utilizzabile e verificato insieme alle sue risorse.
- Specificare una versione Node compatibile con i manifest effettivi, i due `npm ci`, i due terminali, `npm start`, porte 3000/4200, proxy, accesso, arresto con Ctrl+C e diagnosi dei problemi più comuni. Nessun obbligo di CLI globali o hosting esterno.

**Criterio dell'80%:** archivio e guida pronti per un collaudo indipendente dalla cartella di sviluppo.

### Fase F — Prova reale della copia estratta: 80–95%

- Estrarre lo ZIP appena preparato in una cartella temporanea con spazi nel percorso, senza dipendenze preinstallate o collegamenti alla cartella originale.
- Verificare anche il percorso di avvio descritto per il download di `Finale`: `.env` da creare, database operativo assente e preparazione esplicita del database o dello snapshot. Non attribuire al branch il collaudo dello ZIP con dati e configurazioni aggiuntivi non documentati.
- Installare le dipendenze di frontend e backend dalla copia estratta usando i lockfile. Se rete, ambiente o strumenti impediscono la prova, registrare il limite senza trasformarlo in esito positivo.
- Avviare backend con il database incluso attraverso la configurazione di consegna, poi frontend, verificando che i server siano quelli della copia estratta e non processi preesistenti.
- Controllare backend, proxy e API; in Google Chrome provare accesso con un account di collaudo, navigazione e refresh di una route diretta, lettura di spazi e dati storici, almeno un flusso che scrive dati e lettura di una foto disponibile. Usare solo i dati della copia di collaudo per le operazioni di scrittura.
- Verificare persistenza dopo arresto e nuovo avvio e assenza di errori di migrazione. Distinguere l'esito del login dalla verifica di mantenimento/rinnovo della sessione.
- Eseguire, se possibile, un'installazione e un avvio reali su ARM e Intel. In assenza di entrambe le architetture, indicare esattamente quella provata e richiedere il riscontro del collega per l'ambiente non disponibile.

**Criterio del 95%:** prova locale completa della consegna estratta superata; eventuali ambienti esterni non ancora provati elencati esplicitamente.

### Fase G — Pubblicazione su `Finale`, riscontro del destinatario e chiusura: 95–100%

- Aggiornamento autorizzato dall'utente: pubblicare prima su GitHub, poi il collega scaricherà il branch `Finale` per il collaudo ARM. L'invio dello ZIP tramite WhatsApp non è più necessario; lo ZIP rimane un artefatto del collaudo locale.
- Dopo il push, far rieseguire al collega la procedura scaricando `Finale`, senza riutilizzare `node_modules` dello ZIP precedente, e raccogliere l'esito di installazione, migrazioni, backend, frontend e login.
- Se compare un errore, correggerlo nel progetto di riferimento, aggiornare le verifiche e rigenerare l'archivio: non lasciare il destinatario con correzioni manuali non riportate nel progetto.
- Quando i collaudi risultano positivi, preparare commit mirati nella storia di `Finale` con codice corretto, test, documentazione, snapshot verificato previsto dalla consegna e rimozione delle dipendenze tracciate. Controllare il diff completo e l'assenza di segreti, backup o file operativi inseriti per errore.
- Prima del push ricontrollare il branch remoto: se è avanzato, integrare il nuovo lavoro e ripetere le prove pertinenti. Pubblicare con un push normale verso `Finale`, senza force push, dopo l'ok all'esecuzione del piano e il superamento delle verifiche. Non pubblicare su `main` come destinazione alternativa.
- Verificare su GitHub che `Finale` punti al commit previsto e che i file pubblicati corrispondano al candidato collaudato. Ripetere dal contenuto pubblicato il controllo di completezza e della procedura di avvio; se il candidato cambia durante l'integrazione, ricollaudarlo.
- Annotare data, ambiente, commit finale, prove effettive e limiti. Nessuna modifica automatica alla pianificazione delle vecchie automazioni.

**Criterio del 100%:** database storico preservato, installazione nuova e migrazioni verificate con le dipendenze di `Finale`, consegna estratta collaudata, avvio del collega confermato e pubblicazione su `Finale` verificata. Senza riscontro del destinatario o senza push verificato, la relativa attività resta in attesa e non si dichiara il 100% del presente piano. Un'eventuale esclusione di una verifica richiede una scelta esplicita dell'utente.

## 5. Materiali da produrre durante l'esecuzione autorizzata

- Diagnosi documentata e correzione minima dei file effettivamente necessari.
- Backup e istruzioni di ripristino con percorsi reali, senza inserire segreti nel Markdown.
- Test di regressione che riproducano il database storico e i casi negativi.
- Database e risorse della consegna verificati, senza reset dei dati originali.
- Guida di avvio da ZIP e archivio senza dipendenze native copiate.
- Commit mirati e pubblicazione verificata su `Finale`, con esclusione delle dipendenze installate dal controllo versione.
- Rapporto finale distinguendo esito locale, installazione da zero, avvio da download del branch, riscontro del collega e commit pubblicato.

## 6. Registro di avanzamento

| Fase | Peso | Traguardo cumulativo | Stato | Evidenze |
| --- | ---: | ---: | --- | --- |
| A — Inventario e recuperabilità | 10% | 10% | Completata | Backup permanente e inventario verificati |
| B — Diagnosi completa | 20% | 30% | Completata | Cinque SQL storici recuperati, solo commenti rimossi |
| C — Correzione e dati | 20% | 50% | Completata | Database 1–8, record preesistenti invariati |
| D — Test | 15% | 65% | Completata | Backend 158, frontend 256, lint e build superati |
| E — ZIP e guida | 15% | 80% | Completata | Zero dipendenze nell’indice; ZIP e guida verificati |
| F — Collaudo da ZIP | 15% | 95% | Completata | Chrome pulito: accesso, refresh, scrittura e riavvio riusciti |
| G — Conferma, push e chiusura | 5% | 100% | In attesa | Pubblicazione verificata; resta conferma ARM del collega |

**Revisione del piano:** un subagent ha svolto una revisione indipendente in sola lettura; integrate le indicazioni su integrità SQLite, preservazione dei dati, casi negativi e collaudo della consegna. Nessuna implementazione delegata o iniziata.
**Aggiornamento del 29 ottobre 2026:** integrate le evidenze del confronto remoto con `Finale`, i quattro manifest/lockfile diversi, la distinzione fra snapshot versionato e database operativo, la pulizia delle dipendenze tracciate, i test delle dipendenze aggiornate e la pubblicazione finale. Un secondo subagent ha revisionato i criteri di integrazione. Esecuzione ferma allo 0%; nessuna riparazione o pubblicazione iniziata.
**Attività attuale:** pubblicazione completata e verificata; in attesa della prova del collega dal branch Finale.
**Prossimo passo:** il collega scarica Finale e segue AVVIO-SLOTLAB.md. Raccogliere esito di installazione, migrazioni, backend, frontend e login sul suo Mac ARM; solo dopo dichiarare il 100%.
**Nota sulla dichiarazione precedente:** il completamento delle revisioni frontend/backend non equivaleva al collaudo della copia completa con il database storico. Questo piano aggiunge esplicitamente la verifica della consegna prima della dichiarazione finale di funzionamento.

## Registro esecuzione autorizzata — 29 ottobre 2026

- **10%:** backup consistente SQLite di entrambi i database e archivio dei file locali, patch e stato salvati in `/private/tmp/slotlab-recovery-20261029/`. Entrambi i database: integrity_check ok, zero violazioni FK; rispettivamente 55 e 54 righe complessive in 20 tabelle. Backup da conservare fino alla chiusura.
- **30%:** confronto indipendente conferma commenti SQL rimossi nelle migrazioni 1, 2, 3, 4 e 6. Recuperati i file autentici dal commit `867d33027b`, con hash esattamente uguali a quelli registrati. La 5 è già corretta. Correzione scelta: ripristino byte per byte degli SQL storici, senza aggiornare i checksum o disattivare verifiche; poi applicare 7 e 8 sulle copie e confrontare tutti i record.
- Il remoto `Finale` è ancora `d75fd75`; nessun nuovo lavoro remoto rilevato.

- **50%:** ripristinati i cinque SQL autentici; applicate 7 e 8 a copie consistenti e confrontate tutte le colonne originali di 19 tabelle (49/48 record), senza differenze. Aggiornati database operativo e snapshot tramite backup SQLite dopo la verifica; integrity_check ok e zero violazioni FK. Nessun checksum riscritto.
- **65%:** test storici 3/3; suite backend 158/158; frontend 256/256 in 66 file; lint e build superati con i manifest di Finale. Avvisi non bloccanti di dipendenze deprecate, CommonJS e budget SCSS conservati nei log. Fixture storica anonima aggiunta, senza credenziali o dati operativi.
- Integrata la storia remota in un branch locale Finale con reset esclusivamente dell’indice (file del lavoro preservati e backup precedente disponibile); main non modificato. Nessun commit o push ancora eseguito.

- **80%:** guida `AVVIO-SLOTLAB.md` e `.env.example` completati; entrambe le installazioni `npm ci` dalla copia estratta riuscite. Zero file di dipendenze installate rimasti nell'indice Git. ZIP senza `.env`, database operativo e node_modules; include snapshot verificato e fixture anonima. Snapshot e database operativo restano distinti.
- **95%:** collaudo effettivo con Node 26.7.0 x64 in cartella `Collaudo ZIP/SlotLab`: backend 200, proxy API 401 senza sessione, Chrome in incognito su localhost:4200 con account creato solo nella copia di test. Login admin, elenco dei tre spazi, route /admin/spaces e refresh riusciti. Modifica nome di uno spazio salvata soltanto nella copia di test e ancora presente dopo arresto/riavvio del backend e refresh; sessione mantenuta. Lo ZIP finale non include questa modifica né le credenziali di test. Lo snapshot contiene zero segnalazioni: nessuna foto di segnalazione disponibile per un controllo visivo, risorse esistenti comunque preservate. Nessuna prova reale su ARM dichiarata.
- Restano gli avvisi di build su Browserslist obsoleta, budget SCSS e CommonJS; nessun errore bloccante in lint, test o build. Il recupero email SMTP non rientra nella correzione e non è stato collaudato.
- Ripristino di emergenza: backup permanente nella cartella sorella `Backup-SlotLab-ripristino-20261029`, con database precedenti, inventario, archivio file e patch. A server fermo ripristinare tramite SQLite Backup il database precedente e i file SQL precedenti dall'archivio solo se si vuole annullare questa correzione; tale combinazione ripristina anche l'errore originale. Non scambiare backup e pacchetto di consegna.
- **Incompleti:** riscontro del collega sul Mac ARM, push su GitHub e verifica del contenuto pubblicato. Non dichiarato il 100% e nessun push effettuato.

- Revisione finale indipendente del subagent: SQL/checksum, integrità dei due database, conservazione dei record, fixture e guida coerenti. Precisato che lo snapshot contiene il catalogo ma nessun account: la guida indica come creare il proprio amministratore, senza distribuire credenziali di collaudo.

- Correzione salvata nel commit locale `7b1008d` su `Finale`; main e remoto invariati. Ultima revisione del Markdown salvata separatamente. Server di collaudo fermati alla fine delle prove. Stato corrente: 95%, in attesa del destinatario, non della sua nuova autorizzazione a correggere.

## Aggiornamento della modalità di consegna — 29 ottobre 2026

L’utente ha autorizzato esplicitamente la pubblicazione su GitHub prima del collaudo del collega: il riscontro ARM non è più una condizione preventiva del push. Rimane una verifica finale aperta. Il remoto è stato ricontrollato ed è ancora d75fd75; nessun aggiornamento concorrente rilevato. I commit locali 7b1008d e 9af3814 contengono la correzione già collaudata; questo aggiornamento riguarda soltanto il piano. Non si pubblicano .env, database operativo o node_modules.

### Pubblicazione verificata — 29 ottobre 2026

Push normale riuscito da d75fd75 a f173ad8b961f35d257876c163e5e8ea957d2502e. Il commit remoto coincide con quello locale. Riletti gli oggetti da GitHub in archivio Git temporaneo: tutti i 383 file pubblicati coincidono byte per byte con i file locali collaudati (salvo aggiornamenti documentali successivi ai test). Presenti guida, snapshot, fixture e migrazioni; assenti node_modules, .env e database operativo. Nessun aggiornamento concorrente sovrascritto. Questo rapporto viene aggiunto con un successivo commit documentale, senza modificare il codice verificato. Prova ARM ancora non disponibile: 100% non dichiarato.
