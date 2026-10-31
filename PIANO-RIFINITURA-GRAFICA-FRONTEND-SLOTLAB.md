# Piano di rifinitura grafica del frontend SlotLab

**Creato:** 30 ottobre 2026.
**Concluso:** 31 ottobre 2026.
**Stato:** COMPLETATO — tutte le tranche A–G verificate e documentate.
**Avanzamento verificato:** 100% del piano di rifinitura grafica.
**Progetto:** `/Users/Shared/Programmazione Web e Mobile/SlotLab`.
**Branch locale rilevato:** `Finale`, commit iniziale `827a109fac8357eb7849d2f4beb97b74e0f62db0`.

## 1. Richiesta e perimetro

Correggere i tre difetti delle schermate fornite e migliorare progressivamente font, leggibilità, allineamenti e formattazione dell'intero sito Angular/Ionic. Conservare identità visiva, colori di base, logo, contenuti, componenti Ionic e comportamento responsive.

Il piano e il backup sono stati approvati e l’utente ha successivamente autorizzato l’esecuzione completa delle rifiniture e il collaudo con Chrome tramite Playwright. Gli interventi applicativi riguardano solo SCSS; template, logica, database operativo e dipendenze sono preservati. Nessun push per questa revisione.

Le istruzioni della cartella padre sono state lette; `SlotLab/AGENTS.md` non risulta presente. Ricontrollarlo prima di lavorare. Preservare modifiche locali e materiali ufficiali; non iniziare il punto 3.2 citato dal padre. Il file temporaneo Word `~$ida-integrale-corso-e-progetto-SlotLab.docx` era già presente e non va cancellato.

**Esclusioni:** nessuna revisione del backend, di autenticazione, autorizzazioni, API, migrazioni, SMTP, seed, database, routing o piattaforme native. Eventuali ostacoli funzionali scoperti vanno documentati separatamente, senza trasformare questa rifinitura in una riscrittura generale. Non introdurre dipendenze o font remoti per ottenere una modifica puramente grafica.

## 2. Backup e punto di ritorno già disponibili

**Cartella:** `/Users/Shared/Programmazione Web e Mobile/Backup-SlotLab-UI-20261030-181716`.

| Materiale | Esito |
| --- | --- |
| `sorgenti-e-configurazione.tar.gz` | 382 file verificati rileggendo l'archivio e confrontando SHA-256 |
| `database/` | 5 backup SQLite consistenti; integrity_check ok e zero errori di chiavi esterne |
| `manifest.json` | Percorso, dimensione e SHA-256 dei file salvati |
| `git-status.txt`, `modifiche-locali.patch`, `commit-partenza.txt` | Stato e riferimento iniziali conservati |
| `schermate-iniziali/` | Copie delle tre immagini fornite dall'utente |
| `RIPRISTINO.md` | Procedura di recupero selettivo |

Il backup comprende configurazione locale e pertanto rimane privato, fuori dal progetto, in cartella con permessi limitati. Non pubblicarlo su GitHub e non inserirlo negli ZIP del progetto. Sono esclusi dipendenze reinstallabili, cache, build generata, directory Git e file temporanei Word. Il repository originale conserva la cronologia Git.

**Rollback grafico:** fermare soltanto i server interessati; estrarre l'archivio in una cartella temporanea; confrontare i file della tranche e ripristinare solo quelli necessari. Non sovrascrivere lavoro successivo dell'utente. I database non vanno ripristinati per annullare modifiche CSS. Se occorresse un ripristino dati, salvare prima lo stato corrente e gestirlo separatamente: non perdere le operazioni manuali svolte dall'utente dopo il backup.

Prima di ogni tranche annotare elenco dei file interessati e riferimento del precedente punto stabile. Se la tranche non supera i controlli, correggerla o ripristinarla prima di estendere il lavoro alle altre pagine.

## 3. Evidenze dell'analisi preliminare — riferimento storico, verifiche nel registro

Analisi svolta dal responsabile e da due subagents in sola lettura. Le cause seguenti sono ipotesi sostenute dal codice; i tre difetti sono visibili nelle schermate, ma non sono ancora stati riprodotti nella stessa configurazione browser.

### Difetto 1 — Gestione spazi amministratore

- Route: `/admin/spaces`, modulo aperto, compreso il gruppo «Caratteristiche e servizi».
- File: `src/app/admin-spaces/admin-spaces.page.html`, relativo SCSS e `src/global.scss` nel blocco `app-admin-spaces`.
- Nel globale il form usa una griglia con `align-items: start`; input e select hanno min-height, bordi e padding personalizzati. Le checkbox hanno un riquadro esterno con min-height, mentre icona e testo sono disposti internamente da Ionic.
- Da verificare: centratura verticale effettiva del contenuto, dimensione del riquadro rispetto all'area interna, allineamento delle etichette, caselle numeriche, selettori e interferenza delle regole globali con quelle responsive della pagina.
- Obiettivo: icona e testo ben allineati nel riquadro, altezze e spaziature coerenti. Non centrare automaticamente tutti i testi in orizzontale: mantenere la leggibilità delle etichette e dei valori.

### Difetto 2 — Dettaglio segnalazione amministratore

- Route: `/admin/reports`, segnalazione selezionata, campo «Stato».
- File: `src/app/admin-parts/report-detail.component.html` e `.scss`.
- Il select condivide una regola di bordo, altezza, display e padding con il campo HTML readonly. Riceve inoltre variabili Ionic di padding, sfondo e raggio.
- Da verificare: interazione tra host del componente e wrapper interno Ionic. La ripetizione della stessa dichiarazione CSS sul medesimo elemento non disegna da sola due bordi; il problema va cercato nei livelli effettivamente renderizzati.
- Obiettivo: un unico perimetro visivo, testo e freccia allineati, stessa geometria percepita del campo readonly, popover e salvataggio ancora funzionanti.

### Difetto 3 — Nuova segnalazione utente

- Route: `/reports/new/1`, da aprire con ruolo utente normale.
- File: `src/app/report-create/report-create.page.html` e `.scss`.
- Le card dei campi hanno bordi arrotondati; select e textarea hanno ulteriori bordi sull'host, sfondi e padding Ionic. Le etichette usano labelPlacement stacked.
- Da verificare: area interna rettangolare che copre gli angoli, eventuale sovrapposizione tra bordo esterno e superficie interna, distanza tra label e placeholder. Il caricamento foto è un input HTML nativo e richiede una verifica distinta.
- Obiettivo: angoli puliti, gerarchia chiara tra card e controllo, nessuna sovrapposizione, descrizione leggibile, contatore ed errori correttamente posizionati.

### Aspetti condivisi

- `src/theme/variables.scss` definisce già colori chiari/scuri e token Ionic, ma non una scala tipografica esplicita.
- Il sito usa molte dimensioni in pixel distribuite nelle pagine; una famiglia di font globale non è dichiarata esplicitamente.
- Parte degli stili specifici della pagina admin spazi è nel globale: verificarne la priorità prima di spostarli. Evitare di cambiare insieme specificità, geometria e tipografia senza poter attribuire il risultato a una modifica precisa.
- Usare proprietà e variabili CSS effettivamente supportate dalla versione Ionic installata e `::part` soltanto dove la parte è esposta. Non affidarsi a selettori privati dello Shadow DOM o a nuove regole `!important` generalizzate.
- Per ogni controllo stabilire chi disegna bordo e sfondo: wrapper esterno oppure componente Ionic. Una card esterna può restare se ha una funzione di raggruppamento distinta e non interferisce con il controllo.

## 4. Metodo per ogni piccolo passo

1. Definire pagina, difetto, file e risultato atteso.
2. Riprodurre il caso e salvare screenshot prima della modifica, con viewport CSS, zoom, tema, browser e ruolo.
3. Applicare una modifica circoscritta; conservare binding, nomi dei campi, validazioni, attributi ARIA, eventi e gestione del caricamento.
4. Provare gli stati coinvolti e almeno una pagina adiacente che usa gli stessi stili.
5. Registrare dopo ogni passo: file cambiati, motivo, prove riuscite/fallite, screenshot prima/dopo, regressioni, limitazioni e prossimo passo.
6. Passare alla tranche successiva solo dopo un risultato stabile. Non dichiarare risolto ciò che è stato soltanto modificato o compilato.

**Subagents:** delegare audit indipendenti per area admin, area utente e regressioni tipografiche. Quando si passa all'implementazione assegnare file distinti; un solo responsabile modifica `global.scss` e `variables.scss` per evitare conflitti. La revisione finale deve essere indipendente dall'autore della modifica quando possibile.

## 5. Sequenza di esecuzione e traguardi

Percentuali riferite esclusivamente a questa nuova revisione grafica. Le percentuali saranno aggiornate in base ai criteri effettivamente superati, non al numero di righe cambiate. Backup e analisi preliminare non anticipano il completamento dell'implementazione.

### A — Riproduzione e riferimento visivo: 0–10%

- Confermare versione del progetto, stato locale e disponibilità del backup.
- Riprodurre i tre casi in Chrome e identificare il browser delle schermate. Verificare anche quello se disponibile, senza usare Safari come sostituto del collaudo Chrome richiesto dall'utente.
- Registrare dimensioni CSS del viewport e zoom: le immagini ad alta risoluzione non identificano direttamente questi valori.
- Ispezionare stili calcolati, host Ionic e livelli interni; verificare mode Ionic realmente applicato, senza forzare una modalità globale per nascondere il problema.
- Usare una copia SQLite dedicata al collaudo per ogni operazione che salva dati. Non cambiare il database usato dall'utente per il controllo manuale e non attivare recupero password o invio email durante le prove grafiche.
- Raccogliere anche una baseline di login, pagina utente principale e un'altra pagina admin prima dei cambiamenti condivisi.

**Uscita:** difetti riprodotti o differenze browser documentate; cause confermate quanto basta a scegliere correzioni locali.

### B — Modulo spazi e checkbox admin: 10–30%

- Uniformare la geometria dei sei campi, senza perdere l'allineamento quando compare un errore di validazione.
- Correggere l'allineamento verticale di icona e testo nelle checkbox; provare etichette lunghe come «Aria condizionata».
- Gestire correttamente campi numerici, frecce del select, altezza della zona cliccabile e riduzione della griglia su tablet/mobile.
- Riordinare solo le regole necessarie fra globale e pagina, controllando specificità e breakpoint. Non effettuare in questa fase una migrazione generale degli stili.
- Provare apertura/chiusura, creazione e modifica del modulo, stato disabilitato e errori, salvando eventuali record soltanto nella copia di collaudo.

**Uscita:** primo screenshot corretto, senza regressioni su ricerca, filtri, checkbox e modulo responsive.

### C — Select stato nel dettaglio segnalazione admin: 30–45%

- Separare la geometria del campo readonly da quella del select Ionic dove necessario.
- Adottare un solo disegno del bordo del controllo, con radius, sfondo, padding e altezza compatibili con Ionic.
- Verificare selezione in popover, testo lungo, allineamento icona/freccia, focus e stato di salvataggio.
- Provare cambio segnalazione e salvataggio dello stato su dati di collaudo; nessuna modifica ai payload o alle opzioni di stato.

**Uscita:** secondo screenshot corretto, pannello coerente in entrambi i temi e su schermi piccoli.

### D — Form nuova segnalazione utente: 45–60%

- Correggere select e textarea eliminando conflitti tra angoli, superfici e bordi, mantenendo distinta l'eventuale card di raggruppamento.
- Sistemare distanza tra label, placeholder, valore, testo di aiuto, contatore ed errore.
- Verificare input file separatamente: nome lungo, nessun allegato, file valido e messaggio di errore; mantenere formati e limiti esistenti.
- Provare campo vuoto, focus, testo multilinea e vicino al limite, invio disabilitato/in corso e stato di successo. Gli invii reali avvengono solo nel database di collaudo.

**Uscita:** terzo screenshot corretto e percorso di invio ancora funzionante.

### E — Tipografia e criteri condivisi, con pagine pilota: 60–70%

- Definire una famiglia di font comune disponibile localmente e coerente tramite i token Ionic; non aggiungere download o servizi esterni.
- Definire una piccola scala per titolo pagina, sottotitolo, testo, label, metadati e aiuti; scegliere pesi e interlinee leggibili, evitando modifiche arbitrarie alla dimensione radice del documento.
- Definire pochi valori coerenti per spaziature, altezza dei controlli, radius e focus. Distinguere controlli a riga singola, textarea, checkbox e upload invece di imporre la stessa altezza a tutto.
- Provare prima una pagina admin e una pagina utente, più login e menu. Verificare overflow, pulsanti e larghezze dopo il cambio font.
- Non trasformare tutti i testi o pulsanti in maiuscolo e non ridurre le label per farle entrare nei riquadri.

**Uscita:** scala condivisa verificata sulle pagine pilota e nessuna regressione nei tre difetti già risolti.

### F — Estensione progressiva a tutto il sito: 70–90%

Procedere per gruppi, completando il registro dopo ciascuno:

1. **Accesso e account:** login, registrazione, recupero password, cambio password ed eliminazione account. Verificare gli ultimi due solo visivamente o con account dedicati e senza inviare email o eliminare dati reali.
2. **Amministrazione:** panoramica, spazi, edifici, disponibilità, prenotazioni e dettaglio, avvisi, utenti, segnalazioni e dettaglio, statistiche e filtri data.
3. **Utente:** home, spazi, mappa, dettaglio spazio, prenotazione, conferma, elenco/dettaglio prenotazioni, partecipanti e ingresso check-in, preferiti, notifiche, segnalazioni e creazione.
4. **Parti comuni:** profilo, topbar, menu admin desktop/mobile, navigazione inferiore, footer, card, dialoghi, popover, stati vuoti, caricamento ed errori.

Controllare gerarchia dei titoli, allineamento delle label, densità delle liste, uniformità dei pulsanti, testo lungo, icone e colori nei due temi. Mantenere le strutture tabellari dove utili al confronto dei dati. Evitare abbellimenti che riducano la chiarezza o introducano nuove interazioni.

**Uscita:** ogni gruppo verificato; nessuna area esclusa implicitamente con un generico «stile globale aggiornato».

### G — Collaudo e chiusura: 90–100%

- Ripetere i tre casi iniziali e i flussi essenziali con API reale e dati di collaudo: accesso, navigazione, refresh di una route, modifica spazio, stato segnalazione, invio segnalazione e avvio prenotazione.
- Eseguire lint e build. Eseguire i test Angular pertinenti se si modificano template/binding e la suite frontend finale quando si cambia lo stile condiviso. I test DOM non certificano allineamenti o angoli: serve il controllo visivo.
- Non scrivere test che controllano soltanto la presenza delle regole CSS; aggiungerli solo per un rischio concreto di comportamento o accessibilità.
- Verificare `git diff --check`, assenza di file backend/dipendenze alterati, assenza di dati/credenziali inseriti per errore nel diff.
- Produrre confronto prima/dopo, elenco preciso dei file, verifiche, avvisi preesistenti, eventuali limiti e percorso di rollback. Non pubblicare prima del collaudo; commit e push seguiranno le istruzioni dell'utente per questa revisione, senza presumere che l'autorizzazione del precedente ripristino comprenda un nuovo restyling.

**Uscita:** difetti risolti e controllati, tutte le aree previste riviste, prove registrate. Solo allora dichiarare conclusa questa revisione.

## 6. Matrice minima di verifica

| Aspetto | Verifiche |
| --- | --- |
| Browser | Chrome come riferimento; browser delle immagini se disponibile; eventuali limiti dichiarati |
| Viewport CSS | Desktop 1440 px circa e larghezza originale rilevata; tablet 768 px; mobile 390 px e 360 px; controllo vicino ai breakpoint 900/1180 px per le pagine interessate |
| Tema | Scuro e chiaro, senza testo illeggibile o superfici interne discordanti |
| Accessibilità | Tab/Shift+Tab, Space sulle checkbox, Enter, focus visibile, label e ARIA conservati, errori associati e non coperti |
| Stati | Vuoto, compilato, placeholder, errore, disabilitato, caricamento, successo e testo lungo |
| Geometria | Un perimetro coerente per controllo; angoli puliti; centro verticale di icone/testi; nessun taglio di label o valore |
| Responsive | Nessun overflow orizzontale della pagina; eventuale scorrimento tabellare intenzionale e accessibile; zoom browser 200% senza perdita delle azioni |
| Dati e sicurezza | Scritture solo su copia di collaudo; nessun reset/seed operativo, email inviata, modifica credenziali o cancellazione reale |

Per i tre difetti iniziali applicare tutta la matrice. Per le altre pagine verificare almeno desktop/mobile e due temi, approfondendo i componenti che cambiano o condividono una regola modificata. Non moltiplicare prove non pertinenti quando un rischio è già risolto.

## 7. Registro operativo

| Tranche | Traguardo | Stato | Evidenze richieste |
| --- | ---: | --- | --- |
| Backup e analisi preliminare | Prerequisito | Completati | Archivio, manifest, cinque DB verificati, analisi di due subagents |
| A — Riproduzione | 10% | Completata | Browser, viewport e screenshot runtime prima delle modifiche |
| B — Admin spazi | 30% | Completata | Allineamenti, checkbox, errori e responsive |
| C — Admin segnalazione | 45% | Completata | Select coerente, focus e cambio stato |
| D — Nuova segnalazione | 60% | Completata | Angoli, textarea, upload e validazioni |
| E — Tipografia pilota | 70% | Completata | Token e confronto su pagine rappresentative |
| F — Resto del sito | 90% | Completata | Registro distinto per quattro gruppi |
| G — Collaudo finale | 100% | Completata | Gate, screenshot, rapporto e rollback |

### Scheda da compilare dopo ogni passo

- Data e tranche:
- File modificati e motivo:
- Punto stabile precedente:
- Browser, viewport, tema e ruolo:
- Verifiche e risultati:
- Screenshot prima/dopo:
- Dati di collaudo utilizzati:
- Regressioni o limitazioni:
- Stato effettivo e prossimo passo:

**Attività attuale:** nessuna; implementazione, verifiche e documentazione concluse.
**Prossimo intervento previsto:** nessuno per questo piano. Eventuale pubblicazione su GitHub su istruzione dell’utente.

## Registro di esecuzione — 30 ottobre 2026

- Backup verificato prima dell’avvio. Server di collaudo su 3100/4201, database consistente separato in `/private/tmp/slotlab-ui-20261030/collaudo.sqlite`, upload isolati e nessuna configurazione SMTP. Account fittizi dedicati ai due ruoli; database utente non selezionato dai server di prova.
- Chrome: login amministratore e apertura del modulo rilevati nell’albero accessibilità. La cattura nativa della finestra presenta aggiornamenti in ritardo rispetto al DOM; alcune immagini acquisite non mostrano lo stato appena aperto e non sono accettate come prova di risoluzione. Sessione incognito utilizzata. Due 401/404 iniziali sono assenza di sessione/foto profilo, non il difetto dei campi.
- Primo intervento circoscritto in `src/global.scss`: geometria uniforme input/select del modulo spazi, bordo sul contenitore esterno e interno trasparente, checkbox con contenuto centrato verticalmente. Template, binding e dati invariati. Correzione da verificare visivamente prima di completare la tranche B.
- Patch dei due form di segnalazione e dei token tipografici preparate da subagents in cartella temporanea: non applicate prima del collaudo del caso pilota.

### Chiusura recuperabile del passo pilota — registro storico, superato dall’autorizzazione successiva

La proposta per admin spazi supera build, lint e revisione indipendente del subagent. La verifica visiva non è affidabile con il controllo nativo attuale: coordinate rifiutate con assenza finestra e catture non aggiornate rispetto al DOM. Un tentativo di accesso al Dock ha raggiunto il timeout dello strumento; sessione di controllo resettata senza risolvere il limite. Le immagini temporanee non vengono usate per dichiarare risolti i difetti.

Le istruzioni dello strumento richiedono una richiesta esplicita dell'utente per un altro metodo di controllo: inviata domanda per usare Chrome tramite Playwright su dati isolati. La risposta è ancora pendente. Nessun consenso dedotto dal tempo trascorso.

Per non lasciare modifiche grafiche non verificate nel sito, ripristinato soltanto src/global.scss al contenuto esatto del backup (identico a HEAD); proposta conservata in `/private/tmp/slotlab-ui-20261030/step-b-proposta-verificata.patch` e `global-step-b-proposto.scss`. Le patch report e tipografia restano pronte e non applicate. Backend, dipendenze, configurazione privata e database dell'utente non modificati. Server isolati chiusi dopo le prove. Implementazione completata ancora 0%; baseline e collaudo visivo da terminare.

Prossimo passo: dopo la scelta del metodo, acquisire i tre riferimenti veri in Chrome, applicare la patch pilota e proseguire secondo B–G. Non è necessaria una nuova autorizzazione ai cambiamenti di stile già richiesti; manca soltanto la scelta sul metodo di test.

### Tranche A completata con Chrome automatizzato

L’utente ha autorizzato esplicitamente Chrome con Playwright. Acquisite baseline reali con Google Chrome 156.0.8078.74, viewport CSS 1440×1000, device scale 1 e motion ridotto. Riprodotti tutti e tre i difetti. Checkbox: icona spostata di 14 px verso l’alto rispetto al centro del riquadro; confermate superfici interne non arrotondate nei controlli delle segnalazioni. Baseline e misure salvate in `/private/tmp/slotlab-ui-20261030/baseline-*.png` e `baseline-metrics.json`. Applicata nuovamente la sola patch B per verificarla. Dati sempre isolati; nessuna email inviata.

### Tranche B verificata

In Chrome a 1440, 768, 390 e 360 px, le sei checkbox hanno differenza verticale icona/riquadro di 0 px (prima -14 px). I sei controlli del modulo hanno altezza uniforme di 50 px. Verificati checkbox con mouse e Space, errori edificio/nome, selettore edificio e creazione di uno spazio nel solo DB di collaudo. Schermate step-b-*.png e misure step-b.json. Nessuna modifica a template o logica. Si procede al dettaglio segnalazione; verifica chiara/scura trasversale prevista nel collaudo successivo.

### Tranche C verificata

Select amministratore con unico bordo e superficie coerente, verificato su 1440/768/390/360 px nei due temi (otto schermate step-c-*). Apertura popover, selezione dello stato e salvataggio PATCH 200 riusciti nel DB isolato; refresh successivo riuscito. Corretta anche l’altezza minima del pulsante di salvataggio con min-height CSS effettivo di 48 px al posto di una variabile non supportata. Template e logica invariati. Avviato il form utente come passo successivo.

### Tranche D verificata; tipografia pilota avviata

Otto schermate nei due temi e quattro larghezze: angoli regolari, label/placeholder e textarea leggibili, errori associati e contatore conservati. Provati file non valido, PNG con nome lungo e invio POST 201 nel DB isolato con stato di successo. Adeguato il contrasto del testo sul pulsante file al token primary-contrast. Introdotti token tipografici locali e famiglia condivisa Ionic/body; eliminata la maiuscolizzazione CSS generalizzata dei pulsanti a favore del testo originale. Nessuna dipendenza remota o modifica ai binding. Verifica pilota prima di estendere gli interventi.

### Tranche E verificata; estensione F avviata

Pagine pilota admin e home utente verificate a 1440/390 px nei due temi, più login con errori su mobile (step-e-*). Font locale Avenir Next con fallback di sistema, token condivisi, pulsanti in testo originale e gerarchia conservata. Nessun overflow di pagina rilevato sui piloti. Avviata estensione con 48 sostituzioni tipografiche esplicite in 20 SCSS, senza modificare icone o breakpoint; uniformati gli altri controlli con bordo personalizzato (edifici, disponibilità, avvisi, accesso/account, partecipanti e dettaglio prenotazione). Tutte le modifiche sono soltanto SCSS; nessun TS/HTML/API cambiato. In corso verifica indipendente per gruppi admin e utente.

### Controlli automatici e revisione indipendente

Suite frontend: 66 file e 256 test superati. Lint superato. Build di produzione riuscita con avvisi su Browserslist, budget CSS e moduli CommonJS; nessun errore bloccante. La revisione statica indipendente ha individuato l’highlight interno Ionic ancora attivo nei due controlli delle segnalazioni: azzerato con la variabile supportata --highlight-height, mantenendo il focus esterno della pagina. In corso controllo visivo successivo. Un primo avvio delle matrici durante build/test ha avuto timeout di caricamento login: nessun errore JavaScript rilevato, schermata poi correttamente renderizzata; prove iniziali non accettate e ripetute.

### F — Gruppo accesso pubblico e percorso prenotazione

Login, registrazione e recupero password: 12 schermate Chrome (1440/390 px, chiaro/scuro), ispezionate visivamente; nessun overflow del documento o del contenuto Ionic nelle misure eseguite. Campi arrotondati, icone e toggle password conservati. Nessun invio di recupero password o registrazione effettuato. Password/eliminazione account autenticati restano nella matrice utente in corso.

Prenotazione su DB isolato: creata con POST 201 per il 31 ottobre, due partecipanti, conferma corretta e dettaglio con elenco partecipanti mantenuto dopo refresh (booking-flow.json). Il primo tentativo del test usava il selettore name per un attributo Angular impostato come proprietà: corretto lo script su id, senza modifiche al progetto. Le sessioni dei revisori sono ora distinte per evitare la sostituzione reciproca prevista dalla regola di sessione unica.

Confronto SHA-256 con il backup su 382 file: 28 differenze, tutte SCSS; nessun file mancante o differenza inattesa. Backend, template, TypeScript, dipendenze e configurazione privata identici al riferimento salvato. Matrici visuali indipendenti ancora in esecuzione; avanzamento mantenuto al 70% finché F non è verificata integralmente.

## Chiusura del 30 ottobre su richiesta dell’utente — storico, punti completati il 31 ottobre

**Punto salvato: circa 85%, nessuna dichiarazione di completamento totale.** Tutte le modifiche applicative sono in 28 SCSS, senza cambiamenti a HTML, TypeScript, backend, dipendenze o configurazione privata. Nessun commit/push per questa revisione. Backup iniziale conservato nella cartella già indicata.

### Risultati verificati

- Tre difetti iniziali risolti: checkbox admin centrate (scarto verticale 0 px), select stato con perimetro coerente, select/textarea utente con angoli regolari. Verifiche nei due temi e a 1440/768/390/360 px nelle tranche B–D.
- Tipografia locale condivisa, pulsanti con testo originale, gerarchia coerente; nessun font remoto. Estensione agli altri controlli con bordo personalizzato.
- Matrice admin: 36 combinazioni, 9 route × 2 temi × desktop/mobile, ispezionate da revisore indipendente; nessun errore JavaScript. I 404 diagnosticati sono foto profilo assente.
- Statistiche: individuato un vero overflow mobile di 143 px causato dagli span accessibili assoluti nelle barre. Prova nel browser con position:relative sulla barra: overflow pagina da 143 a 0, scorrimento del solo grafico conservato. Applicata la stessa regola a .bar-chart__bar e build finale riuscita. Da ricontrollare sul sorgente applicato alla ripresa.
- Accesso pubblico: 12 schermate desktop/mobile nei due temi, nessun overflow; validazioni, toggle password e focus esterno 3 px verificati separatamente. Nessun invio email.
- Utente: desktop chiaro/scuro verificato dal subagent; la matrice mobile generale NON è certificata (tentativi finiti in login/errore di connessione, causa da isolare nel collaudo). Sono invece riuscite le prove mobile specifiche su home pilota, nuova segnalazione e dettaglio prenotazione. Nessun nuovo difetto applicativo attribuito a quei tentativi non validi.
- Prenotazione reale su copia: POST 201, partecipante aggiunto, conferma e dettaglio persistenti al refresh. Modifica dello spazio fittizio e pulsante disabilitato durante il salvataggio verificati.
- Controlli finali spazi a 360/768/900/1180/1440 px: centratura e assenza overflow; Space/Shift+Tab e reflow CSS zoom 2×. Questo ultimo controllo NON equivale a una prova del menu zoom nativo del browser.
- Suite frontend: 256 test su 66 file superati. Lint superato. Build finale dopo l’ultima modifica riuscita. git diff --check superato. Avvisi di build su Browserslist, budget SCSS e CommonJS registrati nei log.

### Ancora da chiudere al 30 ottobre — elenco successivamente completato

1. Ripetere le 14 route utente su mobile 390 px nei due temi con un solo account/sessione, raccogliendo URL/status degli eventuali errori API; non riutilizzare le immagini mobile non valide del subagent.
2. Ricontrollare statistiche mobile dopo la regola applicata, con viewport 360/390 e scroll del grafico.
3. Completare lo script final-controls (ultimo giro interrotto/incompleto: cambiare tema a viewport desktop prima del resize mobile, perché il toggle topbar può essere nascosto su mobile); le prove già riuscite restano registrate sopra. Completare conferma/check-in con prenotazione reale nei due temi e revisione visiva delle zone sotto la piega. Non effettuare check-in fuori finestra o azioni distruttive.
4. Zoom browser nativo 200% ancora non verificato; Firefox delle immagini non collaudato. Non sostituire Chrome con Safari.
5. Aggiornare F/G e dichiarare concluso solo dopo queste verifiche. Nessuna nuova autorizzazione necessaria per riprendere il perimetro già approvato; attendere però una nuova richiesta dell’utente dopo questo stop.

**Evidenze persistenti:** `/Users/Shared/Programmazione Web e Mobile/Verifiche-UI-SlotLab-20261030` (schermate valide, report, log e LEGGIMI; esclusi dati e configurazione privata). Il report mobile incompleto è conservato come diagnostica, non come prova superata. Gli script e i dati di prova rimangono in `/private/tmp/slotlab-ui-20261030`, senza essere pubblicati.

## Ripresa del 31 ottobre 2026

Autorizzata dall’utente la chiusura fino al 100%. Istruzioni e piano riletti; SlotLab/AGENTS.md ancora assente. Stato locale coerente con il punto salvato (28 SCSS più questo piano; file temporaneo Word preservato). Riavviati solo i server isolati 3100/4201 sulla copia SQLite esistente, senza configurazione SMTP. Nessuna modifica al backend o al database operativo.

La revisione indipendente del vecchio runner conferma un difetto della prova: una qualunque pagina Ionic visibile, inclusa login, era accettata; inoltre il report unico poteva essere sovrascritto. La nuova matrice usa una sola sessione, verifica URL finale, completamento richieste API, overflow e checkpoint dopo ogni pagina. Le prove non valide precedenti non certificano il mobile.

### Passo verificato: matrice mobile e statistiche

Nuova matrice mobile: 15 route × 2 temi = 30 casi su viewport CSS 390×1000, con 40 schermate (incluse parti basse e viste desktop aggiuntive di dettaglio/conferma/check-in). Login reale UI, nuova prenotazione 38 nel DB isolato per il 2 novembre con partecipante (POST 201), conferma con ID effettivo. Zero redirect inattesi, errori JavaScript, errori API inattesi e overflow. Gli unici 404 ammessi sono la foto profilo assente. Ogni pagina ha URL e API verificati e report salvato progressivamente. Revisione visiva indipendente delle nuove immagini in chiusura.

Statistiche: controllo indipendente del fix applicato in 6 combinazioni (360/390/1440, scuro/chiaro), 12 immagini sopra/sotto la piega. Overflow documento e contenuto Ionic sempre zero; grafico mantiene lo scorrimento interno previsto. Nessuna modifica necessaria dopo il punto salvato. Evidenze temporanee distinte: /private/tmp/slotlab-ui-20261031-user e /private/tmp/slotlab-ui-20261031-admin.

### Passo verificato: gruppi F conclusi e gate funzionali

Il revisore indipendente ha ispezionato tutte le 40 nuove immagini della matrice utente: nessun difetto CSS bloccante. Le quattro famiglie F sono ora coperte: accesso/account (incluse password/eliminazione soltanto visive), nove aree admin, quindici route utente e parti comuni. Menu amministratore mobile e navigazione inferiore funzionanti; verificata persistenza dello stesso elemento topbar durante la navigazione SPA home→spazi.

Gate con API reali sulla sola copia: modifica spazio PATCH 200 con checkbox da tastiera, stato segnalazione PATCH 200 e valore mantenuto dopo refresh, errori form e nuova segnalazione POST 201. Il primo assert del runner usava erroneamente in_progress invece del valore UI in-progress: corretto il test secondo il template e ripetuto con passaggio reale a resolved; nessun codice applicativo cambiato. Login e prenotazione con partecipante già verificati nella matrice principale.

Suite finale rieseguita: 66 file, 256 test superati. Lint superato, build finale riuscita; restano i consueti avvisi Browserslist/budget CSS/CommonJS. SHA-256 su 382 file del backup: 28 sole differenze SCSS, zero file mancanti o differenze inattese.

Firefox 159, con profilo temporaneo, ha superato uno smoke complementare sui tre difetti (desktop scuro 1440×1000 e mobile chiaro 390×844); 6 schermate ispezionate, nessun overflow. Le prove di accesso ripetute hanno attivato il limite login 30/15 minuti nel server di collaudo: attesa la scadenza naturale, poi completate le verifiche, senza cambiare la protezione. Nessun problema di autenticazione attribuito al CSS.

## Chiusura definitiva — 31 ottobre 2026

**STATO_REVISIONE: COMPLETATA — 100%.** Tutti i punti rimasti alla chiusura del 30 ottobre sono stati affrontati. La ripresa ha completato il collaudo delle modifiche già salvate: non sono state necessarie altre modifiche applicative rispetto ai 28 SCSS del punto stabile.

### Esito per area

| Tranche | Esito finale | Prova principale |
| --- | --- | --- |
| A | Conclusa | Tre difetti riprodotti in Chrome, backup e baseline conservati |
| B | Conclusa | Centratura checkbox 0 px, controlli uniformi, creazione/modifica e tastiera, più viewport |
| C | Conclusa | Select con bordo unico, popover, PATCH 200 e stato conservato al refresh |
| D | Conclusa | Angoli corretti, errori, file valido/non valido, testo lungo, POST 201 e successo |
| E | Conclusa | Font locali e token coerenti, pagine pilota e due temi |
| F | Conclusa | Accesso/account, 9 aree admin, 15 route utente, parti comuni; revisione indipendente |
| G | Conclusa | Gate funzionali, suite, build/lint, confronto, zoom nativo e compatibilità complementare |

### Ultime verifiche concluse

- Chrome mobile: 30 casi su 15 route nei due temi, 40 immagini ispezionate indipendentemente; incluse conferma e dettaglio della prenotazione reale 38 nella copia, e ingresso check-in senza effettuare verifiche fuori finestra. Nessun redirect inatteso, errore JavaScript, errore API inatteso o overflow.
- Admin: matrice generale precedente di 36 casi, più 6 nuovi casi statistiche con 12 immagini sopra/sotto la piega. Il fix applicato contiene lo scorrimento nel grafico; pagina e contenuto Ionic non debordano.
- Zoom nativo Chrome 200%: DPR 2, viewport CSS 720×450 e visualViewport.scale 1. Tutti e tre i difetti verificati nei due temi; focus, scroll, popover e testo multilinea utilizzabili. In chiaro le misure dell’effettivo .inner-scroll sono 720/720 nei tre percorsi. In scuro le prove interattive e le catture completano la verifica; i vecchi valori 0/0 letti dal contenitore nascosto non sono usati come misura del contenuto. Undici schermate valide archiviate.
- Firefox 159: smoke complementare dei tre difetti a desktop 1440×1000 scuro e mobile 390×844 chiaro, sei immagini e metriche ispezionate. Nessun overflow o difetto di bordo rilevato. Il collaudo primario resta Chrome.
- Salvataggi e navigazione: spazio modificato, stato segnalazione mantenuto dopo refresh, nuova segnalazione inviata, prenotazione con partecipante e conferma corrette. Menu admin e navigazione mobile funzionanti; topbar persistente verificata durante navigazione Angular SPA.
- Suite finale: **256/256 test su 66 file**. Lint e build riusciti; diff privo di errori di whitespace. Confronto SHA-256 su 382 file iniziali: 28 differenze, tutte SCSS, nessuna differenza inattesa o file mancante.

### Evidenze, confronto e recupero

Cartella conclusiva: `/Users/Shared/Programmazione Web e Mobile/Verifiche-UI-SlotLab-20261031`. Sottocartelle chrome-mobile, chrome-statistiche, gate-finali, chrome-zoom200, firefox e confronti. Il confronto apribile è `confronti/index.html`: sei immagini prima/dopo, verificate nel browser, senza risorse mancanti o overflow. Le immagini finali sono screenshot del codice corrente in Chrome scuro 1440×1000; date, account e selezione dei report possono variare rispetto alla baseline.

Il backup iniziale rimane `Backup-SlotLab-UI-20261030-181716`; seguire il relativo RIPRISTINO.md per recuperare selettivamente gli SCSS. Non ripristinare i database per annullare una modifica grafica. I vecchi report di tentativi interrotti/non validi restano soltanto diagnostica storica e sono superati dai risultati conclusivi qui indicati.

### Perimetro e limiti registrati

- Modifiche applicative solo in 28 SCSS; backend, template, TypeScript, dipendenze, configurazione privata e dati operativi preservati. Nessun font remoto, piattaforma nativa o servizio di hosting aggiunto.
- Operazioni di prova solo su DB/upload isolati e account fittizi. Nessuna email inviata, password reale modificata, cancellazione account o check-in fuori finestra.
- I 404 della foto profilo facoltativa e il PNG 1×1 di prova non sono difetti CSS. Gli avvisi Browserslist, budget CSS e CommonJS sono riportati nei log; nessun errore bloccante.
- Le verifiche responsive usano viewport browser; non costituiscono una certificazione su ogni dispositivo fisico o browser. Chrome e lo smoke Firefox descritti sono effettivamente verificati; Safari non è stato usato.
- Server 3100/4201 di collaudo chiusi, browser/profili temporanei chiusi. Nessun commit o push effettuato per questa revisione.

**Lavoro ancora necessario per questo piano: nessuno.**

## Pubblicazione autorizzata — 31 ottobre 2026

L’utente ha autorizzato esplicitamente commit e push sul branch Finale, seguiti da un controllo finale. Fetch iniziale: HEAD e origin/Finale allineati a 827a109, nessun commit remoto da integrare. Revisione indipendente: 28 SCSS e questo piano, senza backend, dipendenze, configurazione privata o dati. Il file temporaneo Word rimane escluso. Dopo il push verranno verificati il riferimento remoto e i controlli frontend; l’esito sarà registrato qui.
