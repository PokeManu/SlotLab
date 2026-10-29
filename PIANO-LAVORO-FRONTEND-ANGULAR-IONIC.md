# Piano di lavoro frontend — Angular e Ionic

**Progetto:** SlotLab  
**Stato al 11 ottobre 2026:** Aree 1–7 e verifica finale concluse nel perimetro confermato dall'utente: **sito Angular/Ionic responsive su PC e browser dei cellulari**, con PWA. L'app iOS installabile e la prova su dispositivo fisico non sono richieste per la consegna; la prova aggiuntiva in simulatore è documentata separatamente.  
**Avanzamento al 11 ottobre 2026:** **100% dei criteri applicabili del piano**. Gli avvisi non bloccanti della build e i limiti della futura distribuzione nativa sono elencati nella chiusura finale.  
**Perimetro:** solo frontend Angular/Ionic. Endpoint, payload, database, autorizzazioni del server e codice backend restano fuori da questo piano.  
**Materiale di riferimento:** `../12. Angular.pdf` e `../13. Ionic_Angular.pdf`.

**Aggiornamento successivo sul perimetro:** il risultato confermato resta il sito Angular/Ionic per browser desktop e mobili. Su richiesta dell'utente, la piattaforma iOS e l'integrazione Capacitor sono state rimosse dal progetto; i riferimenti alle prove native più avanti sono conservati come cronologia delle verifiche svolte prima di tale rimozione. Il lavoro di pulizia e verifica del server locale è tracciato in `PIANO-SERVER-LOCALE.md` e non cambia l'esito delle Aree 1–7.

## Obiettivo e criterio architetturale

SlotLab è già un'app Angular con componenti standalone, routing, guardie e un `ion-router-outlet`. Il problema da risolvere non è trasformare pagine statiche in una SPA: il routing client esiste già. La distanza rispetto al modello discusso a lezione riguarda soprattutto il **layout ripetuto in ogni pagina**, il limitato uso dei **componenti visuali Ionic**, la gestione dei **form** e la collocazione delle **chiamate HTTP**.

Il risultato atteso è un'app in cui Angular gestisce route, componenti, dati, servizi e form, mentre Ionic fornisce navigazione, struttura visuale, controlli e comportamento mobile. Un layout condiviso deve mantenere stabili le parti comuni mentre il contenuto associato alla route cambia. Le pagine di dettaglio possono comunque occupare l'intero schermo: è un comportamento normale della navigazione Ionic, non una violazione del modello delle slide.

La figura *header — router-outlet — footer* della slide Angular è un modello concettuale. In Ionic la soluzione concreta può includere `ion-header`, `ion-content`, `ion-tab-bar`, `ion-menu` e outlet annidati **solo dove la gerarchia delle route lo richiede**. La scelta delle tab va verificata sul comportamento degli stack di navigazione prima di applicarla a tutte le route.

### Stato di partenza verificato

- `src/main.ts` registra Angular Router, `provideIonicAngular` e `IonicRouteStrategy`.
- `src/app/app.component.html` contiene `ion-app` e `ion-router-outlet`.
- `src/app/app.routes.ts` definisce route lazy, parametri, redirect e guardie utente/admin.
- Topbar e navigazione mobile sono ripetute nelle pagine utente; la sidebar è ripetuta nelle pagine admin.
- Nei template prevalgono HTML e CSS personalizzati: Ionic compare soprattutto in `ion-content` e `ion-icon`; mancano quasi tutti i controlli visuali Ionic principali.
- Esistono form Angular template-driven, ma non risultano Reactive Forms; varie pagine chiamano `HttpClient` direttamente.
- `src/theme/variables.scss` contiene i token `--slot-*` per tema scuro e chiaro; non contiene ancora una mappatura organica sui token colore Ionic.

### Vincoli comuni a tutte le aree

1. Conservare URL pubblici, `returnUrl`, guardie, differenza tra ruoli e contratti HTTP esistenti.
2. Procedere per tranche verificabili: ogni migrazione deve lasciare funzionanti le route e i flussi non ancora migrati.
3. Preservare la semantica HTML dove serve. Ionic non richiede di rimpiazzare tabelle, contenuti testuali, mappe o il selettore file con componenti inadatti.
4. Evitare componenti, servizi e astrazioni dimostrative senza un uso concreto nel prodotto.
5. Non avviare automaticamente il punto 3.2 indicato nelle istruzioni della cartella padre: questo documento pianifica il frontend richiesto qui.

---

## Area 1 — Navigazione e layout

### Obiettivo

Centralizzare la struttura comune delle sezioni utente e admin. Quando l'utente seleziona una sezione, deve cambiare il contenuto instradato senza ricreare in ogni pagina topbar, navigazione e sidebar. Le route di dettaglio mantengono, dove opportuno, una presentazione a schermo intero e un percorso di ritorno chiaro.

### Stato attuale e file coinvolti

- Outlet e route: `src/app/app.component.html`, `src/app/app.routes.ts`, `src/main.ts`.
- Navigazione condivisibile: `src/app/topbar-component/`, `src/app/mobile-navigation/`, `src/app/admin-parts/admin-sidebar.component.*`, `src/app/auth/navigation-items.ts`.
- Pagine da migrare: `home/`, `spaces/`, `bookings/`, `favorites/`, `reports/`, `notifications/`, `profile/` e le nove pagine `admin-*/`.
- Le route pubbliche, transazionali e di dettaglio richiedono una collocazione esplicita; non vanno inglobate automaticamente in una tab.

### Fasi operative

1. **Disegnare la mappa delle route e dei layout.** Classificare `/home`, `/spaces`, `/bookings`, `/favorites`, `/profile` come sezioni principali utente; `/notifications` e `/reports` come sezioni secondarie; `/spaces/:id`, `/booking/:id`, `/bookings/:id`, `/confirmation/:id` e `/reports/new/:spaceId` come flussi di dettaglio o transazionali. Trattare `/admin` e le otto sottosezioni admin come gruppo distinto. Definire il comportamento di `/login`, `/register`, `/forgot-password`, `/check-in/:id`, `/profile/password` e `/profile/delete`; `/profile` è accessibile anche ad admin e va gestita senza perdere tale possibilità. Per ogni route annotare header, navigazione, titolo e destinazione del tasto Indietro.
2. **Costruire un prototipo ristretto su Home, Spazi e Prenotazioni.** Introdurre un layout padre utente e il relativo outlet senza cambiare gli URL. Verificare due alternative: `ion-tabs`/`ion-tab-bar` con stack indipendenti, oppure una navigazione condivisa Ionic sopra un outlet unico. Scegliere in base al comportamento reale di passaggi tra sezioni, deep link, tasto Indietro e flussi Spazi → dettaglio → prenotazione. Evitare outlet annidati aggiuntivi se non danno un vantaggio concreto.
3. **Migrare il layout utente.** Portare header e navigazione fuori dai template delle sette pagine che li ripetono; convertire la barra in `ion-header`/`ion-toolbar`/`ion-buttons` e la navigazione mobile nel pattern Ionic scelto. Conservare logo, collegamenti, profilo, tema e indicatori notifiche. Lasciare in ciascuna pagina solo contenuto e componenti specifici della sezione.
4. **Migrare il layout admin.** Prototipare `ion-split-pane` e `ion-menu` con `ion-menu-button` su viewport stretti. Usare le nove voci di `adminNavigation` senza duplicarle nelle pagine. Dopo la verifica rimuovere `<app-admin-sidebar>` e le varianti di `.admin-shell` ripetute; mantenere le tabelle e i contenuti specifici nei relativi componenti.
5. **Definire i layout di dettaglio e accesso.** Applicare una toolbar minima con titolo/back dove migliora il flusso; mantenere l'esperienza a schermo intero per login, check-in e operazioni che lo richiedono. Verificare che il ritorno da dettaglio spazio, prenotazione, conferma e dettaglio prenotazione punti alla sezione corretta anche dopo refresh o apertura diretta.
6. **Riallineare `ion-content` e safe area.** Rimuovere solo dopo la migrazione i padding aggiunti per la vecchia barra fissa. Usare `fullscreen` consapevolmente; evitare header, tab bar o menu sovrapposti al contenuto. Centralizzare i breakpoint del layout e conservare breakpoint locali solo per il contenuto delle singole pagine.
7. **Aggiornare test e rifinire.** Verificare route dirette, refresh su URL annidati, guardie, ruoli, link attivo, back/forward, logout, una sola navigazione visibile e comportamento con pagine conservate da `IonicRouteStrategy`. Aggiornare i test di routing e navigazione interessati.

### Criteri di completamento

- Topbar, navigazione utente e menu admin esistono una sola volta per il rispettivo layout, non in ciascun template di pagina.
- Il cambio sezione avviene tramite Angular Router e outlet, con URL e guardie invariati; non compare un reload completo.
- Su desktop, tablet e mobile non ci sono barre duplicate o contenuti coperti; il tasto Indietro e l'apertura diretta delle route funzionano.
- Gli stack di tab, se adottati, hanno un comportamento comprensibile nei passaggi tra sezioni e dettagli.

### Esito dell'Area 1 — 9 ottobre 2026

- `app.component` ospita un solo `ion-router-outlet` stabile e sceglie il layout in base a route e ruolo. Le sette sezioni utente condividono `ion-header` e, fino a 1100 px, `ion-footer` con navigazione Ionic; le nove sezioni admin condividono `ion-split-pane` e `ion-menu`, che diventa un menu apribile fino a 1180 px.
- La navigazione usa Angular Router sopra l'outlet unico. Il prototipo ha confermato che i flussi correnti funzionano meglio con una cronologia lineare: `ion-tabs` introdurrebbe stack separati per sezioni che condividono dettagli e `/profile`. Le pagine di accesso, dettaglio e operazione rimangono a schermo intero; `/profile` riceve il layout del ruolo attivo.
- Topbar, navigazione mobile e sidebar sono state rimosse dai template di pagina. URL, guardie e contratti HTTP sono rimasti invariati; il backend non è stato modificato.
- Verifica eseguita: 156 test superati, lint, typecheck e build riusciti. Nel browser sono stati controllati accesso utente e admin, cambio route senza reload, link attivo, menu admin, refresh su URL diretti e viewport mobile, tablet e desktop. La safe area e l'esperienza Capacitor richiedono ancora una prova su dispositivo iOS reale, prevista nelle Aree 5 e 7.

### Dipendenze e rischi

Questa area precede la migrazione diffusa di toolbar, menu e safe area nelle altre aree. Il rischio principale è introdurre `ion-tabs` per imitare la slide senza considerare gli stack indipendenti delle tab o le route condivise come `/profile`: la decisione è un risultato del prototipo, non un presupposto. Non sono previsti cambi al backend.

---

## Area 2 — Componenti UI Ionic e feedback

### Obiettivo

Usare Ionic come sistema effettivo di interfaccia per i controlli, le liste, le card e i messaggi di stato, mantenendo Angular per logica e composizione. La migrazione deve conservare le funzioni già presenti e l'identità visiva SlotLab.

### Stato attuale e file coinvolti

`src/app/space-card/`, `src/app/space-list-item/` e `src/app/admin-parts/` sono già componenti Angular riutilizzabili, ma costruiscono buona parte dell'interfaccia con `article`, `div`, `button`, input e CSS personalizzati. `src/app/spaces/spaces.page.html` e i template admin sono buoni punti di partenza per misurare la migrazione. `ion-content` e `ion-icon` da soli non danno un uso intensivo della libreria Ionic.

### Fasi operative

1. **Fare l'inventario dei pattern UI.** Per ogni pagina classificare azioni, ricerca, filtri, card, liste, indicatori di stato, caricamento, vuoto, errori, conferme e finestre sovrapposte. Annotare il componente Angular proprietario e il componente Ionic appropriato; distinguere controlli condivisi da contenuti specifici.
2. **Stabilire una mappa di migrazione.** Convertire azioni in `ion-button`, ricerca in `ion-searchbar`, elenchi in `ion-list`/`ion-item`, riepiloghi in `ion-card`, stati brevi in `ion-badge`/`ion-chip`, segmenti dove rappresentano davvero viste alternative in `ion-segment`. Usare `ion-spinner` o `ion-skeleton-text` per caricamenti visibili. Riservare `ion-alert` alle conferme e `ion-toast` agli esiti temporanei; messaggi persistenti e istruzioni restano nel contenuto. I campi dei form sono dettagliati nell'Area 3.
3. **Migrare prima i componenti riutilizzati.** Aggiornare internamente `SpaceCardComponent`, `SpaceListItemComponent` e gli altri elementi ripetuti, mantenendo input/output Angular e click/`routerLink`. Pilotare il risultato su Home e Spazi prima di estenderlo a Preferiti, Prenotazioni, Notifiche e Profilo.
4. **Migrare i flussi utente restanti.** Applicare gli stessi pattern a dettagli, prenotazione, segnalazioni e conferma. Verificare che le azioni primarie restino riconoscibili e che caricamento, successo, errore e vuoto abbiano comportamenti coerenti.
5. **Migrare i controlli amministrativi.** In `admin-spaces`, `admin-buildings`, `admin-availability`, `admin-bookings`, `admin-users` e negli altri pannelli usare componenti Ionic per pulsanti, ricerca, filtri e conferme. Mantenere tabelle HTML dove sono la rappresentazione più leggibile su desktop; per mobile prevedere una resa a lista/card se la tabella non è utilizzabile.
6. **Ridurre CSS duplicato e verificare interazione.** Dopo ogni gruppo di pagine eliminare gli stili che ricreano manualmente un componente Ionic sostituito. Verificare focus, tastiera, disabled, etichette, overlay, scroll e import standalone dei nuovi componenti.

### Criteri di completamento

- Le azioni e i controlli interattivi principali di utente e admin sono componenti Ionic quando esiste un equivalente adatto.
- Liste, card, stati e feedback condivisi sono coerenti tra pagine; non ci sono doppie implementazioni del medesimo pattern.
- Eventi Angular, route, accessibilità, comportamento responsive e contratti HTTP restano corretti.
- Tabelle, mappa Leaflet e input file conservano la semantica o l'integrazione necessaria.

### Avanzamento dell'Area 2 — 9 ottobre 2026

- **UI pilota Home/Spazi verificata:** `SpaceCardComponent` usa `ion-card` come azione apribile, `ion-badge` e `ion-card-content`; `SpaceListItemComponent` usa `ion-item` e `ion-badge`, con pulsanti Ionic separati per apertura e preferiti. La lista di Spazi usa `ion-list`; l'azione “Vedi tutti” di Home usa `ion-button`. Input/output Angular e navigazione esistenti sono conservati.
- La ricerca condivisa usa `ion-searchbar` e continua a emettere testo tramite `searchChange`; i filtri rapidi usano `ion-button`, conservano `aria-pressed` e l'output `filtersChange`. Sono stati aggiunti test per ricerca, filtri, card e azioni della lista.
- `FavoriteSpaceCardComponent` usa `ion-card`/`ion-card-content` con due `ion-button` espliciti e indipendenti per aprire lo spazio o rimuoverlo dai preferiti. Un test verifica entrambi gli output senza sovrapposizioni delle azioni.
- In Prenotazioni, `BookingListItemComponent` usa `ion-card`, `ion-badge` e `ion-button`; il selettore Prossime/Passate usa `ion-segment`, mantenendo il filtro mese nativo per la futura verifica dei form nell'Area 3. La card della prossima prenotazione in Home usa gli stessi componenti Ionic e conserva `bookingOpened`.
- Nello storico Segnalazioni, `ReportListItemComponent` usa card e badge Ionic; il caricamento della foto privata mostra `ion-spinner` e mantiene la richiesta/cleanup esistenti. Quando l'API non fornisce l'edificio non compare più un piano fittizio; il conteggio delle segnalazioni distingue singolare e plurale.
- La ricerca in Preferiti, prima non collegata alla lista, filtra ora per nome, edificio e tipo. La vista distingue l'assenza di preferiti dall'assenza di risultati della ricerca, senza cambiare endpoint o payload.
- In Notifiche, le azioni usano `ion-button`, la lista usa `ion-list`/`ion-item` e il caricamento mostra `ion-spinner`. La lettura di una notifica e lo stato disabilitato durante il salvataggio sono coperti da test; la lettura è stata provata anche nel browser.
- In Profilo, le destinazioni del menu usano `ion-list`/`ion-item` e le azioni di rimozione foto e uscita usano `ion-button`. Sono conservati input file nativo, route e logica di logout. Un test verifica le tre destinazioni utente.
- Il dettaglio spazio usa `ion-card` per i servizi, `ion-button` per ritorno e azioni e `ion-spinner` durante la verifica disponibilità. La conferma usa `ion-card`, `ion-button` e `ion-spinner`; il codice prenotazione usa il colore di successo del tema per conservare il contrasto anche in modalità chiara.
- Il form di nuova segnalazione usa ora `ion-select`, `ion-textarea`, `ion-button` e spinner, conservando `ngForm`/`ngModel`, input file nativo e `FormData`. Il successo e il ritorno sono pulsanti Ionic; gli errori locali compaiono dopo interazione o tentativo di invio.
- Il form di prenotazione usa `ion-button` per fascia, contatore e conferma e `ion-input` per gli ospiti, collegati a un `FormGroup`/`FormArray`. La data resta un controllo nativo `type=date`: conserva il formato `YYYY-MM-DD` usato dall'API e il selettore accessibile esistente, evitando conversioni di fuso orario non necessarie. Su mobile le fasce passano a due colonne, senza testo spezzato.
- Il dettaglio prenotazione usa ora `ion-button` per ricarica, rimozione e aggiunta, `ion-badge` per i ruoli/stati, `ion-input` per la nuova email e `ion-spinner` nel caricamento. La logica di modifica partecipanti resta invariata; il controllo email locale evita richieste chiaramente invalide. La vista è stata controllata in Chrome nei due temi su desktop; mobile autenticato resta da verificare.
- I tre flussi account (recupero, cambio password, eliminazione) usano `ion-input`, `ion-checkbox` e `ion-button`. Il pannello admin Avvisi usa `ion-input`, `ion-textarea` e `ion-button` con errori associati ai campi; è il primo caso admin migrato. Preferiti mostra ora caricamento, errore e retry con componenti Ionic. Questi nuovi controlli hanno test di componente; il recupero password è stato controllato nel browser in tema scuro su desktop/mobile, mentre gli altri attendono verifica visiva.
- **Edifici admin, tranche 10 ottobre:** il form usa `ion-input` e `ion-button`, così come le azioni della lista. La tabella desktop rimane HTML. I tre test mirati verificano invalidità, invio singolo, conversione numerica dell'input Ionic, payload POST/PATCH, errore e ricaricamento. Form ed errori sono stati controllati nel browser su desktop chiaro/scuro e mobile scuro con API simulata locale; restano gli altri pannelli admin.
- **Utenti admin, tranche 10 ottobre:** ricerca con `ion-searchbar`, azioni e paginazione con `ion-button`, caricamento con `ion-spinner`, errore e retry distinti dalla lista vuota. La vista HTML a righe resta per i dati densi. Due test coprono ricerca, paginazione, annullamento della richiesta precedente, errore e retry. Il browser conferma ricerca e resa desktop/mobile in tema chiaro con API simulata locale; un difetto di testo spezzato nella paginazione mobile è stato corretto e ricontrollato. La conferma di eliminazione non è stata azionata nel browser.
- **Dashboard admin, feedback 10 ottobre:** i tre riquadri di riepilogo, prenotazioni e stato spazi distinguono ora caricamento (`ion-spinner`), errore con `Riprova` e lista vuota; i numeri vecchi non vengono presentati come aggiornati dopo un errore. Un test verifica errore e recupero indipendenti dei tre riquadri. Google Chrome sulla build aggiornata, con sessione admin simulata a `390×844`, conferma i due stati vuoti, il menu mobile e l'assenza di overflow; lo stato di errore/retry resta verificato dal test, non manualmente nel browser. L'Area 2 **non è completata**.
- **Spazi admin, tranche 10 ottobre:** il modulo di creazione/modifica usa `ion-select`, `ion-input`, `ion-checkbox` e `ion-button` con `FormGroup`; filtri e azioni della tabella restano da migrare in una tranche distinta. Gli stili del modulo sono isolati sotto `app-admin-spaces` nel foglio globale già usato dal pannello: dopo un primo superamento del budget CSS del componente, questa collocazione ha ripristinato la build senza alzare il limite. Il browser con API simulata locale conferma errori, selezione edificio/servizio, creazione e apertura della modifica, su desktop chiaro e mobile scuro; dopo lo spostamento CSS la resa mobile è stata ricontrollata.
- **Spazi admin, seconda tranche 10 ottobre:** i tre filtri usano `ion-select` con gli stessi valori e reset della paginazione; le azioni QR, modifica, elimina e paginazione usano `ion-button`. La pagina corrente è ora testo con `aria-current="page"`, perché non è un'azione. La tabella HTML è conservata e il nome dello spazio recupera il corretto layout della riga. Un test verifica il binding del filtro Ionic, la pagina visibile, le azioni e l'etichetta di eliminazione nel pulsante interno Ionic. Nel browser con API simulata sono stati controllati il filtro Tipologia e i risultati su desktop/mobile scuro, le etichette delle azioni e l'apertura del QR. Altri pannelli admin, conferme e stati di errore restano da completare; l'Area 2 **non è completata**.
- **Disponibilità admin, tranche completata il 10 ottobre:** scelta del giorno, invio dei due form, toggle storico e azioni delle righe usano `ion-select`, `ion-input` e `ion-button`; gli input data/ora restano nativi per conservare i formati richiesti dall'API. Il modulo delle fasce e quello delle eccezioni sono reattivi. Nel browser con API simulata sono stati controllati layout desktop/mobile nei temi chiaro/scuro, errore di periodo, selezione Ionic del giorno, invio dell'eccezione e permanenza della fascia durante il refresh. Le tabelle HTML restano per i dati; gli altri pannelli admin e il feedback generale sono ancora da completare. L'Area 2 **non è completata**.
- **Conferme amministrative, tranche verificata:** Utenti, Edifici e Spazi usano ora `ion-alert` per le eliminazioni al posto della conferma nativa. Il DELETE parte solo dopo la conferma; durante la richiesta i controlli sono disabilitati e lo stato è annunciato. I test mirati e il gate globale passano. Utenti ha inoltre semantica ARIA di tabella, `aria-busy`, annuncio della paginazione e wrapping delle email su viewport stretti. La prova browser delle nuove conferme resta aperta. L'Area 2 **non è completata**.
- **Chiusura controlli residui, 11 ottobre:** ricerca spazio nel pannello admin con `ion-searchbar`, scelta dello spazio in Disponibilità con `ion-select`, pulsanti di visibilità password e ingresso check-in con `ion-button`. Binding, etichette e disabilitazione sono conservati; 27 test mirati in cinque file, lint e typecheck passano. Le conferme Ionic di Utenti, Spazi ed Edifici sono state aperte e annullate in Chrome con API reale su database temporaneo; `Escape` chiude il dialogo e restituisce il focus. Il pulsante legacy di `bookings-sidebar`, non referenziato dalle route correnti, non è stato migrato per evitare codice senza uso.
- **Prenotazioni admin, tranche 10 ottobre:** ricerca e tre filtri usano `ion-searchbar`/`ion-select`; reset, retry e paginazione usano `ion-button`; stato e caricamento usano `ion-badge`/`ion-spinner`. Tabella e dettaglio conservano dati e interazione, incluso Invio/Spazio per la selezione della riga. `DatePipe` sostituisce la formattazione manuale delle date nei filtri. Test mirati e gate globale passano. In **Chrome** con API simulata sono stati verificati ricerca, filtro stato, paginazione e selezione su desktop in tema scuro; una compressione delle intestazioni ha portato a fissare una larghezza minima della tabella nel contenitore scorrevole. La prova mobile e il tema chiaro in Chrome sono ancora pendenti.
- **Segnalazioni admin, tranche 10 ottobre:** filtri `ion-segment`, elenco `ion-list`/`ion-item`, stato `ion-select`, salvataggio/retry `ion-button`, caricamento `ion-spinner`. L'assegnatario è mostrato come informazione perché non esiste un'azione di salvataggio collegata. Il filtro riallinea il dettaglio selezionato; cambiare lo stato di salvataggio non ricarica più la foto. I test coprono selezione, filtro, payload PATCH, errore/retry e foto. In **Chrome** con API simulata sono stati provati filtro, selezione, PATCH riuscito, errore iniziale/retry e tema scuro desktop; la precedente prova browser comprende anche PATCH fallito e tema chiaro. Mobile e API reale restano da verificare.
- **Dashboard e Statistiche admin, tranche 10 ottobre:** Dashboard usa `ion-searchbar` e `ion-button` per ricerca e navigazione; Statistiche usa `ion-button` per Applica/Riprova e `ion-spinner` nel caricamento, mantenendo i due input data nativi per il formato API. Test mirati e gate globale passano. In **Chrome** sono stati verificati caricamento, ricerca Dashboard con URL `/admin/spaces?search=Aula`, metriche/grafici e Applica nelle Statistiche, su desktop in tema scuro. Il retry delle Statistiche, mobile, tastiera e tema chiaro in Chrome restano da verificare.
- La prima mappa di pattern riguarda Home/Spazi: card apribile, elenco con azioni distinte, ricerca e filtri. Rimangono da inventariare e migrare i pattern delle altre pagine utente, dei flussi di dettaglio e delle pagine admin, inclusi caricamenti, vuoti, errori e conferme. L'Area 2 **non è completata**.
- Verifiche: ricerca e filtri di Spazi controllati nel browser, compreso l'aggiornamento reale dei risultati, su desktop/mobile e in entrambi i temi. Dopo aver rilevato un contrasto insufficiente nei filtri inattivi è stato corretto il loro sfondo. Le card dei Preferiti sono state controllate visivamente su desktop/mobile e in entrambi i temi; la loro ricerca e il messaggio senza risultati sono stati provati nel browser. Prenotazioni, riepilogo di Home e storico Segnalazioni sono stati verificati nel browser su desktop/mobile e nei temi chiaro/scuro, compreso il cambio vista di `ion-segment`. Notifiche e Profilo sono stati controllati nel browser con dati simulati su desktop/mobile e nei temi chiaro/scuro; la lettura di una notifica aggiorna lo stato. Dettaglio spazio e conferma sono stati controllati nel browser su desktop/mobile e nei temi chiaro/scuro, compreso il collegamento verso la prenotazione e il contrasto del codice conferma. **Gate completato il 10 ottobre dopo questa tranche:** 169 test in 47 file, build, lint, typecheck e `git diff --check` superati. La build segnala avvisi sui budget SCSS, Browserslist e sulle dipendenze CommonJS Leaflet/QRCode.
- **Prossimo passo dopo le tranche del 10 ottobre:** uniformare feedback e CSS rimasti, verificare su mobile i nuovi pannelli admin e completare la prova visiva di dettaglio prenotazione, form account e Avvisi nei due temi. L'Area 2 resta incompleta.

#### Inventario UI progressivo

| Sezione | Pattern osservati | Stato della migrazione |
| --- | --- | --- |
| Home e Spazi | Card consigliate, lista risultati, ricerca, filtri, riepilogo prenotazione, mappa | Card, lista, ricerca, filtri e riepilogo migrati; stati della mappa da rivedere |
| Preferiti | Ricerca, card con apertura/rimozione, stato vuoto | Card e ricerca migrati e verificati; feedback della rimozione da uniformare |
| Prenotazioni | Scelta mese, due viste, lista, stato, dettaglio, annullamento, vuoto/errore | Segmento, card, badge e pulsanti migrati; mese e feedback di annullamento da valutare con Aree 2–3 |
| Segnalazioni | Storico, badge di stato, foto privata con caricamento/errore; form di creazione separato | Storico, spinner foto e form template-driven Ionic migrati; feedback complessivo da uniformare |
| Notifiche, Profilo e dettagli utente | Azioni, liste, stati, form e conferme | Notifiche e menu Profilo migrati; dettaglio spazio e conferma migrati; form di prenotazione controllato nel browser; dettaglio prenotazione migrato nei controlli ma non ancora verificato visivamente; altre conferme da affrontare |
| Pagine admin | Ricerca, filtri, pulsanti, stati, tabelle e form | Controlli principali migrati in Avvisi, Edifici, Utenti, Spazi, Disponibilità, Prenotazioni, Segnalazioni, Dashboard e Statistiche; tabelle e dati densi conservati in HTML. Restano feedback uniforme, pulizia CSS e prove responsive/accessibilità complete |

### Dipendenze e rischi

La navigazione Ionic dipende dalla scelta dell'Area 1; i controlli di form dipendono dall'Area 3 e i colori dall'Area 5. I componenti Ionic non sono semplici sostituti 1:1 dei tag HTML: valori emessi, focus, overlay e Shadow DOM richiedono verifica. La migrazione segue le funzionalità reali, non una quota numerica di tag Ionic.

---

## Area 3 — Form e validazione Angular/Ionic

### Obiettivo

Usare Angular Forms per stato e regole dei form e componenti Ionic per l'interazione. Conservare un esempio template-driven completo e introdurre Reactive Forms dove la complessità li giustifica. Errori, invio e risposta del server devono essere chiari e accessibili, con gli stessi payload attuali.

### Stato attuale e file coinvolti

`src/app/report-create/report-create.page.html` usa già `ngForm`, `ngModel`, `required`, `minlength`, `invalid` e `touched`. `src/app/auth/access.page.html` usa `ngModel`, mentre parte della validazione password è manuale in `access.page.ts`. I form in `admin-spaces/`, `admin-buildings/`, `admin-availability/` e `admin-announcements/` hanno gestione eterogenea; alcuni invii usano `(submit)` con `preventDefault()`. Non risultano `ReactiveFormsModule`, `FormGroup`, `FormControl` o `Validators` nell'app.

### Fasi operative

1. **Catalogare i form e fissare il contratto.** Per login, registrazione, recupero/cambio password, segnalazione, prenotazione, gestione spazi, edifici, disponibilità, annunci e filtri documentare campi, valori iniziali, validazioni, messaggi, metodo di invio e payload effettivo. Questa matrice è il riferimento per evitare regressioni.
2. **Migrare i controlli visivi.** Usare `ion-input`, `ion-select`/`ion-select-option`, `ion-textarea`, `ion-checkbox`/`ion-toggle`, `ion-button` e `ion-datetime` dove utili. L'upload di immagini resta basato su input file nativo. Verificare tipi emessi da `ion-select` e conversioni di date/ore di `ion-datetime` prima di cambiare ogni form.
3. **Consolidare un form template-driven.** Aggiornare la creazione di segnalazioni conservando `ngForm` e `ngModel`; collegare categorie, descrizione, limiti, errori di controllo e stato di invio ai componenti Ionic. Mostrare errori dopo interazione o tentativo di invio e impedire invii invalidi o doppi.
4. **Introdurre Reactive Forms in un flusso significativo.** Portare login/registrazione in `FormGroup` con `Validators.required`, `Validators.email`, regole password e validatore incrociato per la conferma. Conservare modalità della pagina, `returnUrl`, redirect, servizio Auth e messaggi del server. Convalidare prima questo caso pilota, poi applicare il pattern ai form che hanno regole incrociate o molti campi.
5. **Migrare prenotazione e amministrazione per complessità.** Usare Reactive Forms per data/ora, durata, partecipanti e, se necessario, `FormArray` per indirizzi variabili. Passare poi ai form di spazi, edifici, disponibilità e annunci quando le regole lo richiedono. I filtri rapidi possono restare template-driven. Preferire `(ngSubmit)` allo schema manuale con `preventDefault()` nei form Angular.
6. **Uniformare errori e stati.** Definire quando compaiono errore locale, errore del server, caricamento e successo. Associare etichette e messaggi ai campi, usare `aria-invalid` e riferimenti descrittivi ove applicabili, disabilitare l'invio durante la richiesta e ripristinare il controllo dopo errore.
7. **Verificare i payload con test mirati.** Coprire invalidità, email, conferma password, limiti descrizione, date e orari, partecipanti, doppio submit e uguaglianza del payload rispetto al contratto di partenza.

### Criteri di completamento

- Esistono form template-driven e Reactive Forms realmente usati, entrambi con controlli Ionic appropriati.
- Login, segnalazione, prenotazione e form amministrativi interessati impediscono invii invalidi e mostrano errori nel momento corretto.
- Etichette, focus, tastiera e messaggi di errore sono utilizzabili anche con tecnologie assistive.
- URL, redirect, chiamate e formato dei dati inviati al backend sono invariati.

### Inventario iniziale dei form — 10 ottobre 2026

| Flusso | Campi e stato iniziale | Validazione attuale | Invio e payload da preservare |
| --- | --- | --- | --- |
| Login | Email e password vuote; modalità route `/login` | Obbligatori, email con regex; invio bloccato durante richiesta | `Auth.login`: `POST /auth/login` con `{email: trim+lowercase, password}`; `returnUrl` e redirect per ruolo invariati |
| Registrazione | Nome, cognome, email, password e conferma vuoti; `/register` | Obbligatori, email, requisiti password e corrispondenza conferma | `Auth.register`: `POST /auth/register` con nome/cognome trim, email normalizzata e password; conferma non inviata |
| Recupero/cambio password, eliminazione account | Email vuota oppure password corrente/nuova/conferma vuote; conferma eliminazione falsa | Email valida; password nuova secondo `passwordValidationMessages` e conferma uguale; conferma esplicita per eliminazione | `POST /auth/forgot-password` con email normalizzata; `PATCH /users/me/password` con `{currentPassword,newPassword}`; `DELETE /users/me` con `{currentPassword}` nel body |
| Nuova segnalazione | Categoria vuota, descrizione vuota, foto facoltativa | Categoria richiesta; descrizione 10–500 caratteri; foto JPEG/PNG/WebP ≤5 MB; blocco doppio invio | `POST /spaces/:id/reports` con `FormData`: categoria `equipment` convertita a `technical`, descrizione trim, foto se scelta |
| Nuova prenotazione | Data odierna a Roma, fascia non selezionata, un partecipante organizzatore | Fascia valida, capienza, email partecipanti valide e distinte; blocco doppio invio | `POST /bookings` con `{spaceId,date,availabilityId,participantEmails}` e `Idempotency-Key`; email trim+lowercase; redirect conferma |
| Partecipante in dettaglio prenotazione | Email vuota | Obbligatoria; blocco durante richiesta | `POST /bookings/:id/participants` con `{email: trim}` |
| Spazi admin | Edificio 0, nome vuoto, piano 0, tipologia aula studio, capienza 1, accessibile falso, stato attivo, servizi vuoti | Parte dei campi HTML required/min; regole locali su stato/accessibilità | `POST /admin/spaces` o `PATCH /admin/spaces/:id` con oggetto `form` invariato |
| Edifici admin | Numero 0, nome/indirizzo vuoti, coordinate Palermo | Campi required e numerici; errori server | `POST /admin/buildings` o `PATCH /admin/buildings/:id` con oggetto `form` invariato |
| Disponibilità admin | Dal oggi Roma, al 2099-12-31, lunedì, 08:00–20:00; eccezione con data oggi e motivo vuoto | Date, orari e sovrapposizioni in parte demandati al server | `POST/PATCH /admin/spaces/:id/availability`, `POST .../reuse`, `POST .../unavailability` con i rispettivi oggetti `form`/`exception` invariati |
| Annuncio admin | Titolo e messaggio vuoti | Entrambi obbligatori, messaggio ≤1000 caratteri, invio singolo | `POST /admin/announcements` con `{title: trim, message: trim}` |
| Filtri rapidi | Ricerca vuota, toggle disattivi; filtri admin vuoti | Nessun submit di form | Parametri GET di spazi/admin e stato locale da conservare |

L'inventario registra i contratti attuali, non dichiara ancora corretta o completa la loro validazione.

- **Pilota template-driven implementato:** la nuova segnalazione conserva `ngForm`/`ngModel`, categoria, descrizione e foto opzionale. `ion-select` e `ion-textarea` mostrano etichette e ricevono i valori; l'invio invalido mostra gli errori associati ai campi. Il metodo di invio impedisce richieste duplicate e descrizioni oltre 500 caratteri. Il test controlla `FormData` (`equipment` → `technical`, descrizione e foto), invio invalido e doppio invio.
- Nel browser con API simulate sono stati verificati selezione categoria, conteggio descrizione, errori al tentativo, successo, tema chiaro/scuro e viewport desktop/mobile. Il contrasto degli errori è stato corretto con il token `--slot-danger`. **Gate completo dopo il pilota:** 174 test in 48 file, build, lint, typecheck e `git diff --check` superati.
- **Pilota Reactive Forms implementato e verificato il 10 ottobre:** login e registrazione usano un `FormGroup` con controlli Ionic `ion-input` e `ion-button`. Le regole includono obbligatorietà, email normalizzata, password e conferma incrociata; gli errori compaiono dopo interazione o invio. Il payload di registrazione, la protezione dal doppio invio e i redirect sono coperti dai test. La prova nel browser ha verificato errori, icone, viewport desktop e mobile da 390 px senza scorrimento orizzontale. Il backend locale non era disponibile, quindi la prova di invio riuscito è coperta dai test HTTP, non dal browser.
- **Prenotazione migrata il 10 ottobre:** `FormGroup` contiene data, disponibilità e `FormArray` degli indirizzi ospite; validatori dei singoli indirizzi e del gruppo bloccano vuoti, formato errato, organizzatore duplicato e duplicati tra ospiti. Il controllo della capienza resta esplicito perché dipende dalla fascia ricevuta dal server. Form e controlli vengono disabilitati durante la richiesta; payload, normalizzazione e `Idempotency-Key` restano invariati. Test di invio e di binding `ion-input`/`FormArray` passano. Nel browser con API fittizia locale sono stati provati accesso, fasce, aggiunta ospite, errore e resa desktop/mobile; tema chiaro e invio riuscito end-to-end restano da verificare nel percorso finale.
- Nel dettaglio prenotazione, il form template-driven di aggiunta partecipante usa `ion-input` e `ion-button`, mantiene il `POST` con email trim e blocca ora un'email palesemente non valida. Il test copre l'errore locale e l'assenza di richiesta HTTP.
- **Prossimo intervento Area 3:** form amministrativi complessi; uniformare errori/focus e verificare nel browser i tre flussi account. L'Area 3 **non è completata**.
- **Tranche 10 ottobre, account e Avvisi:** recupero, cambio password ed eliminazione usano un `FormGroup` con validazione di email, password, conferma incrociata e consenso esplicito; i controlli sono Ionic e gli errori sono associati ai campi. `ionViewWillEnter` azzera i segreti al rientro. I payload e i redirect precedenti sono conservati; i test coprono i tre flussi. Avvisi admin resta template-driven perché ha due campi semplici: `ngSubmit`, obbligatorietà, limite messaggio, invio singolo e risposta server sono verificati. Restano gli altri form admin e la prova visiva/accessibilità dei nuovi controlli. L'Area 3 **non è completata**.
- **Prova browser account:** la pagina Recupera password è stata controllata in tema scuro su desktop e viewport mobile da 390 px; l'invio vuoto mostra un solo errore associato al campo, dopo aver eliminato un messaggio duplicato. Il backend locale non era in esecuzione, quindi la riuscita HTTP rimane coperta dai test e non dalla prova browser. Restano tema chiaro, cambio password, eliminazione e Avvisi.
- **Rifinitura account del 10 ottobre:** nei tre flussi account `ion-input` e `ion-checkbox` ricevono esplicitamente `[disabled]` durante una richiesta, oltre al `fieldset`; il test verifica i controlli Ionic in tutti i modi e durante un invio HTTP in corso. I 7 test mirati del componente passano. La prova visiva dei flussi ancora mancanti resta aperta.
- **Difetti emersi in Chrome e corretti il 10 ottobre:** dopo un avviso pubblicato, `NgForm.resetForm()` azzera anche lo stato touched dei due campi, così i messaggi “Inserisci…” non accompagnano l'esito positivo; in Eliminazione account la label di `ion-checkbox` usa `::part(label)` per andare a capo anziché mostrare un'ellissi. I 10 test mirati di account e Avvisi passano, compreso il controllo dell'assenza degli errori dopo il successo. Entrambi i difetti sono stati ricontrollati in Google Chrome nei temi chiaro e scuro con API simulata locale.
- **Dettaglio prenotazione, tranche 10 ottobre:** l'email ospite invalida mostra ora un solo errore associato al campo con `role="alert"`; il messaggio globale resta riservato agli errori del server. Il test mirato conferma un solo alert e nessun `POST` per il valore invalido. In Chrome a 390 px la route diretta conserva il `returnUrl` nella guardia; il form autenticato mobile non è stato ancora aperto.
- **Avvisi admin, rifinitura 10 ottobre:** un invio con campi vuoti o composti solo da spazi mostra gli errori dei singoli controlli Ionic, senza ripetere un terzo messaggio globale. I messaggi ricevuti dal server restano globali e il testo inserito resta disponibile per il retry. Test mirati e suite completa passano; prova visiva specifica di questa rifinitura in Chrome ancora da eseguire.
- **Edifici admin, tranche 10 ottobre:** `FormGroup` tipizzato con obbligatorietà, numero intero positivo, nome/indirizzo non vuoti e coordinate negli intervalli ammessi. L'invio usa `ngSubmit`, disabilita il form durante la richiesta e conserva numeri nel payload POST/PATCH. Dopo errore mantiene i valori per il retry; dopo successo resetta il form e ricarica l'elenco. I tre test del componente passano, inclusa la conversione di `ion-input[type=number]` a numero. Form ed errori sono stati controllati nel browser con dati simulati; restano gli altri form amministrativi e le prove di invio su API reale. L'Area 3 **non è completata**.
- **Spazi admin, tranche 10 ottobre:** creazione e modifica usano ora un `FormGroup` tipizzato, `ngSubmit`, controlli Ionic e messaggi associati ai campi. Edificio, nome, piano intero e capienza intera positiva sono validati; lo stato non attivo deseleziona e disabilita “Accessibile”. POST e PATCH conservano gli otto campi del payload precedente, con numeri convertiti esplicitamente. L'invio invalido o doppio non parte; errore server lascia il form compilato per il retry, successo azzera il form e ricarica l'elenco. Cinque test del pannello passano, inclusi binding numerico Ionic e payload; nel browser con API simulata sono stati provati l'invio di creazione, l'apertura del form di modifica e il cambio di stato. Il PATCH è coperto dal test, non dalla prova browser. Mancano gli altri form admin e la verifica con API reale. L'Area 3 **non è completata**.
- **Disponibilità admin, tranche completata il 10 ottobre:** `FormGroup` delle fasce conserva i cinque campi e i valori iniziali; valida giorno, periodo e orari e blocca invii invalidi o duplicati. Il secondo `FormGroup` valida data, motivo non vuoto e ordine degli orari dell'indisponibilità. POST, PATCH e riattivazione conservano i payload; dopo errore i dati restano editabili. Le mutazioni di riga hanno blocco contro doppi click. Cambiando spazio, moduli e righe si azzerano e le risposte tardive dello spazio precedente sono ignorate; il refresh dopo mutazione mantiene visibili le righe fino alla risposta nuova. `allPages` carica anche gli spazi oltre la prima pagina. Otto test mirati coprono questi comportamenti; prova browser con API simulata su desktop/mobile e due temi. Restano la prova con API reale e i form di altri pannelli; l'Area 3 **non è completata**.

### Dipendenze e rischi

I pattern visuali si coordinano con l'Area 2; i servizi di invio con l'Area 4. `ion-datetime` può cambiare rappresentazione e fuso orario; `ion-select` può cambiare il tipo del valore. Le pagine Ionic possono rimanere nello stack: decidere esplicitamente quando un form va resettato al ritorno. Non spostare regole di validazione dal server al solo frontend.

---

## Area 4 — Servizi frontend, API e stato

### Obiettivo

Applicare in modo uniforme il principio Angular dei servizi: le pagine gestiscono presentazione e interazione, mentre servizi di funzionalità gestiscono chiamate HTTP, tipizzazione, mapping riutilizzabile e stato condiviso quando serve. Il backend e i contratti di rete restano identici.

### Stato attuale e file coinvolti

Esistono già servizi per autenticazione, sessione, tema, notifiche e foto profilo in `src/app/auth/` e altre cartelle. `src/app/api/all-pages.ts` contiene un helper per il caricamento paginato. Tuttavia `src/app/home/home.page.ts`, `src/app/spaces/spaces.page.ts` e varie pagine admin iniettano `HttpClient` direttamente e combinano richieste, mapping, filtri e stato della vista.

### Fasi operative

1. **Mappare gli accessi ai dati.** Inventariare le chiamate `HttpClient` per dominio: spazi/preferiti, prenotazioni/check-in, segnalazioni, notifiche/profilo, dashboard e gestioni admin. Registrare endpoint, metodo, DTO, pagina chiamante, duplicazioni e cache o ricaricamenti esistenti.
2. **Definire confini piccoli di servizio.** Creare servizi per funzionalità concrete, per esempio `SpacesApi`, `BookingsApi`, `ReportsApi` e servizi admin specifici solo quando occorrono. Mantenere l'interceptor e `Auth` esistenti. Separare tipi DTO da modelli di vista se il mapping è ripetuto; evitare un unico servizio che raccolga tutte le API.
3. **Migrare un caso pilota.** Portare il caricamento degli spazi usato da Home e Spazi in un servizio condiviso. Conservare URL, query, error handling e mapping. Verificare che preferiti, ricerca e filtri producano gli stessi dati e che il servizio non conservi impropriamente stato locale della pagina.
4. **Migrare gli altri domini in sequenza.** Procedere con prenotazioni, segnalazioni e notifiche, poi con le pagine admin. Estrarre trasformazioni e logica di riuso; lasciare nel componente la scelta della vista e le interazioni specifiche. Dove l'API è usata una sola volta e non mescola responsabilità, valutare un servizio piccolo senza introdurre gerarchie artificiali.
5. **Definire refresh e stato di navigazione.** Stabilire quando ricaricare al ritorno su una route conservata da Ionic, dopo una mutazione o al cambio utente. Evitare dati obsoleti e richieste duplicate; usare i lifecycle Ionic e Angular secondo la loro semantica. Documentare loading, errore e retry per le viste coinvolte.
6. **Aggiornare test di servizi e componenti.** Testare URL, parametri, header delegati all'interceptor, mapping e propagazione errori nei servizi; testare nei componenti gli stati visibili e le interazioni usando servizi simulati. Verificare esplicitamente che richieste e payload siano invariati.

### Criteri di completamento

- Le principali pagine non contengono contemporaneamente costruzione delle richieste, mapping riutilizzabile e rendering.
- Logica API comune a più pagine ha una sola implementazione testata.
- Dopo navigazione, mutazioni e cambio account i dati visibili sono aggiornati secondo una regola documentata.
- Endpoint, autenticazione, contratti e comportamento utente sono invariati.

### Avanzamento dell'Area 4 — 10 ottobre 2026

| Dominio | Chiamate frontend censite | Pagine/componenti attuali |
| --- | --- | --- |
| Spazi e preferiti | `GET /spaces/recommended`, `GET /spaces` con ricerca/filtri e paginazione, `GET /spaces/:id`, disponibilità per data, `GET/POST/DELETE /favorites` | Home, Spazi, dettaglio, prenotazione, mappa, Preferiti |
| Prenotazioni e check-in | `GET/POST/DELETE /bookings`, dettaglio/partecipanti, `POST /spaces/:id/check-in` | Home, Prenotazioni, creazione, dettaglio, conferma, ingresso check-in |
| Segnalazioni | `GET /reports`, foto privata, `POST /spaces/:id/reports`; lettura/aggiornamento admin | Storico, creazione, card, pannello admin |
| Notifiche e profilo | `GET/PATCH /notifications`, foto profilo `GET/PUT/DELETE`, `GET /users/me` e operazioni account | Notifiche, indicatore, Profilo, Auth |
| Amministrazione | Summary, statistiche, spazi, edifici, disponibilità, prenotazioni, utenti, segnalazioni e annunci sotto `/admin/*` | Dashboard e otto sottosezioni admin |

- **Pilota implementato:** `src/app/api/spaces-api.ts` centralizza richiesta e mapping di spazi consigliati e lista con filtri/paginazione. Home e Spazi lo usano senza cache condivisa: ciascuna vista continua a scegliere quando ricaricare e come mostrare l'errore. URL, parametri e immagine di anteprima sono conservati. La pagina Spazi annulla la richiesta di lista precedente quando parte una nuova ricerca, evitando risultati obsoleti.
- Test mirati su endpoint, mapping, filtri, paginazione, propagazione errori e annullamento della ricerca passano. **Gate completato dopo il pilota:** 173 test in 48 file, build, lint, typecheck e `git diff --check` superati. Restano la migrazione degli altri domini, i refresh dopo mutazioni/cambio account e i relativi test. L'Area 4 **non è completata**.
- **Seconda tranche 10 ottobre:** `BookingsApi` centralizza `GET /bookings`, mapping di data e riepilogo usato da Home/Prenotazioni, `DELETE /bookings/:id`, `POST /bookings` con chiave di idempotenza, `GET /bookings/:id` e le operazioni sui partecipanti. Home, Prenotazioni, creazione, conferma e dettaglio usano il servizio, conservando refresh e messaggi locali; Prenotazioni annulla la lettura precedente al rientro e libera i dati dopo errore. Test di servizio e componenti coprono URL, mapping, payload, annullamento, propagazione errori e richieste obsolete.
- **Terza tranche 10 ottobre:** `ReportsApi` centralizza `GET /reports` con mapping per lo storico, `POST /spaces/:id/reports` con `FormData` e conversione `equipment` → `technical`, e la foto privata `GET /reports/:id/photo` come blob. Storico, creazione e card usano il servizio. La prima entrata nello storico non duplica più la lettura, mentre il rientro ricarica e annulla la richiesta precedente. Test su URL, mapping, `FormData`, foto e cancellazione delle richieste passano.
- **Quarta tranche 10 ottobre:** `NotificationsApi` centralizza lista paginata e `PATCH` di lettura singola/globale. Pagina e `NotificationState` usano la stessa API. La pagina annulla una lettura precedente quando viene ricaricata; il contatore annulla il refresh precedente e ignora risposte di una sessione/account ormai cambiati. I test coprono URL, paginazione, metodi, cancellazione e cambio account. Restano profilo, spazi non ancora centralizzati e amministrazione. L'Area 4 **non è completata**.
- **Quinta tranche 10 ottobre:** `ProfilePhoto` gestisce anche `PUT` e `DELETE` della foto, aggiornando l'anteprima solo dopo successo e solo per l'account che ha avviato la richiesta. `SpacesApi` copre ora dettaglio, disponibilità, lista preferiti, ID preferiti e mutazioni; Home/Spazi, Preferiti, dettaglio e creazione prenotazione condividono i metodi e il mapping. Preferiti annulla letture obsolete, evita il doppio caricamento al primo ingresso e distingue errore da lista vuota. Test mirati su URL, metodi, mapping, disponibilità, mutazioni, retry e rientro passano. Restano API amministrative e regole di refresh delle altre pagine. L'Area 4 **non è completata**.
- **Utenti admin, tranche 10 ottobre:** la ricerca e la paginazione annullano la lettura in corso prima di avviarne un'altra; dopo errore la pagina elimina i risultati vecchi e offre retry. Endpoint, query e dimensione pagina sono invariati. L'Area 4 **non è completata**.
- **Edifici admin, tranche 10 ottobre:** `AdminBuildingsApi` centralizza GET della lista e POST/PATCH/DELETE degli edifici; la pagina conserva form, interazione e messaggi, senza costruire più URL e richieste HTTP. Il servizio mappa la risposta `{data}` e propaga gli errori. I test mirati del servizio, della pagina e del dettaglio prenotazione passano (11 in 3 file); build, lint e typecheck della tranche Edifici passano. Restano le altre API admin e la prova con API reale; l'Area 4 **non è completata**.
- **Statistiche admin, tranche 10 ottobre:** `AdminStatisticsApi` incapsula il GET con gli stessi parametri `dateFrom`/`dateTo` e normalizza liste/storia opzionali. La pagina conserva scelta del periodo, annullamento delle richieste precedenti, loading/retry e trasformazioni dei grafici. Tre test del servizio verificano URL/metodo, normalizzazione ed errore HTTP; i dieci test della pagina continuano a passare (13 mirati in 2 file). Il gate globale passa; la prova con API reale resta aperta. L'Area 4 **non è completata**.
- **Dashboard admin, tranche 10 ottobre:** `AdminDashboardApi` incapsula riepilogo, prenotazioni future su tutte le pagine, stati degli spazi e la lettura dei report. La pagina mantiene la presentazione dei riquadri, ricarica ora anche stati degli spazi e report al rientro e annulla le richieste precedenti per evitare risposte obsolete. Quattro endpoint, metodi e mapping sono coperti da tre test del servizio; cinque test della pagina verificano resa, ricerca, refresh e annullamento. La prova con API reale resta aperta. L'Area 4 **non è completata**.
- **Prenotazioni admin, tranche successiva:** `AdminBookingsApi` centralizza `GET /admin/bookings?page=N&size=100`, paginazione completa e mapping di data, partecipanti e stato. La pagina mantiene ricerca, filtri, selezione, loading, errore e annullamento delle richieste al rientro; il dettaglio importa il tipo dal servizio invece che dalla pagina. Due test del servizio coprono pagine multiple, mapping, errore e annullamento della pagina successiva; i cinque test della pagina continuano a passare (7 mirati in 2 file). Il gate globale passa; la prova Chrome dopo questa tranche è in corso. L'Area 4 **non è completata**.
- **Segnalazioni admin, tranche successiva:** `AdminReportsApi` centralizza lista con mapping di stato/data/priorità, `PATCH /admin/reports/:id/status` con conversione `in-progress` → `in_progress` e foto privata blob. `AdminReportsPage` conserva filtro, loading, retry e annullamento delle letture; `ReportDetailComponent` conserva la revoca degli URL blob e non ricarica la foto quando cambia solo lo stato di salvataggio. Gli 11 test mirati in 3 file passano, così come lint e typecheck. La prova con API reale resta aperta. L'Area 4 **non è completata**.
- **Disponibilità admin, tranche successiva verificata:** `AdminAvailabilityApi` centralizza elenco completo degli spazi, letture delle fasce e delle eccezioni e tutte le relative creazioni, modifiche, riattivazioni e rimozioni. La pagina conserva validazione, blocco dei doppi invii, refresh e protezione dalle risposte obsolete al cambio spazio. Il servizio ha test su paginazione, URL, metodi, payload, mapping ed errori; la suite globale passa. L'API reale resta da provare.
- **Utenti admin, tranche successiva verificata:** `AdminUsersApi` centralizza lista con ricerca/paginazione ed eliminazione, conservando query e dimensione pagina. La pagina annulla la lettura precedente, impedisce doppie eliminazioni, disabilita i controlli durante l'eliminazione, mostra lo stato di avanzamento e ricarica la lista al successo. I test coprono query, DELETE, errori e il doppio invio; la suite globale passa. Le azioni reali nel browser restano aperte. L'Area 4 **non è completata**.
- **Spazi admin, tranche successiva verificata:** `AdminSpacesApi` centralizza lista con ricerca e paginazione completa, elenco edifici, dettaglio e creazione/modifica/eliminazione di uno spazio. La pagina conserva i payload del form, il mapping visuale, i messaggi e la ricarica dopo mutazione. Tre nuovi test verificano URL, query, metodi, payload e paginazione; la suite globale passa. Restano il ricontrollo delle azioni con API reale e le regole di refresh/stato delle altre pagine. L'Area 4 **non è completata**.
- **Servizi residui, 11 ottobre:** `AdminAnnouncementsApi` gestisce la pubblicazione degli avvisi, `PasswordRecoveryApi` il recupero password e `ReportCreatePage` riusa `SpacesApi.detail()` per il contesto della segnalazione. Endpoint, payload e messaggi restano invariati; test mirati e gate da 250 test passano prima delle ultime due estrazioni in corso. La prova con API reale su database demo isolato copre letture utente/admin e una mutazione di Disponibilità. Check-in e mappa sono in rifinitura; aggiornare il gate finale dopo la loro integrazione.
- **Chiusura delle due estrazioni in corso:** `CheckInApi` incapsula `POST /spaces/:id/check-in`; `CampusMapApi` incapsula edifici e paginazione degli spazi, lasciando nel componente la cancellazione della subscription alla distruzione. Sei test mirati per ciascuna tranche passano con typecheck; endpoint e payload non cambiano. Il gate globale dopo queste modifiche è in esecuzione.

### Dipendenze e rischi

La migrazione può procedere in parallelo alla UI dopo aver fissato il comportamento dell'Area 1. Il rischio maggiore è cambiare involontariamente timing e cache delle richieste: confrontare ogni flusso con la baseline prima di rimuovere il codice precedente. Non creare un nuovo store globale senza un requisito reale.

---

## Area 5 — Tema, griglia e adattamento ai dispositivi

### Obiettivo

Portare il sistema visuale SlotLab dentro i meccanismi di theming Ionic, con resa coerente su desktop e mobile, tema chiaro/scuro e safe area corrette. Usare `ion-grid` dove una griglia responsive di contenuto lo rende utile, senza sacrificare layout o semantica già efficaci.

### Stato attuale e file coinvolti

`src/theme/variables.scss` definisce token `--slot-*` per i due temi. `src/global.scss` importa il CSS Ionic, ma l'aspetto dei controlli è soprattutto regolato da CSS locale. Breakpoint e padding per topbar, sidebar e navigazione mobile sono distribuiti in vari file SCSS. Le pagine non usano in modo sistematico `ion-grid`, `ion-row` e `ion-col`.

### Fasi operative

1. **Inventariare token e layout.** Elencare colori, superfici, testo, bordi, stati, spaziature, breakpoint e safe area attuali. Identificare quali sono globali e quali appartengono a una singola vista.
2. **Mappare i token SlotLab sui token Ionic.** Definire le variabili colore Ionic necessarie, comprese le varianti richieste dal sistema colori Ionic, in modo coerente con tema scuro e chiaro. Usare le CSS custom properties e le parti esposte dai singoli componenti per modifiche mirate; conservare i token SlotLab per elementi di brand non coperti da Ionic.
3. **Stabilire regole condivise di spaziatura e superficie.** Applicarle a header, menu, tab bar, card, liste, form e feedback man mano che vengono migrati. Ridurre override profondi e selettori fragili verso il DOM interno dei web component Ionic.
4. **Applicare la griglia dove serve.** Provare `ion-grid`/`ion-row`/`ion-col` nelle sezioni a card di Home/Spazi e nei form o riepiloghi che cambiano colonne in base alla larghezza. Conservare CSS Grid o tabelle quando rendono meglio dati densi, dashboard admin o struttura della mappa.
5. **Verificare responsive e safe area.** Consolidare i breakpoint di navigazione dopo l'Area 1; controllare iOS/Capacitor, viewport mobile stretti, tablet e desktop. Assicurarsi che `ion-content` non sia coperto da toolbar, menu o tab bar e che il contenuto non riceva doppio padding.
6. **Controllare accessibilità visiva.** Verificare contrasto in entrambi i temi, focus visibile, ingrandimento del testo, touch target e preferenze di movimento ridotto dove esistono animazioni.

### Criteri di completamento

- I componenti Ionic nuovi seguono il tema SlotLab in modalità chiara e scura senza stili duplicati per pagina.
- Header, tab bar, contenuto e menu rispettano safe area e breakpoint; nessun contenuto viene tagliato o coperto.
- Le griglie applicate migliorano la resa mobile e desktop; tabelle, mappa e dati densi restano leggibili.
- Focus, contrasto e dimensioni di interazione sono verificati sui percorsi principali.

### Avanzamento dell'Area 5 — 9 ottobre 2026

- `src/theme/variables.scss` mappa superfici, testo e colori primario, successo, avviso e pericolo sui token Ionic per tema scuro e chiaro, comprese varianti RGB, contrasto, shade e tint. I token SlotLab restano disponibili per l'identità visiva.
- I primi componenti migrati sono stati verificati nel browser sui due temi e su viewport desktop/mobile; i valori calcolati del colore primario e del contrasto sono risultati coerenti. Restano da definire le regole condivise di spaziatura e superficie per le altre pagine, valutare la griglia Ionic dove utile e verificare safe area e accessibilità visiva sull'intera app. L'Area 5 **non è completata**.
- Durante la verifica della conferma, il codice prenotazione risultava poco leggibile nel tema chiaro: ora usa `--slot-success` e il contrasto è stato ricontrollato nel browser.
- Nel form segnalazione gli errori e l'icona di successo usano i token semantici `--slot-danger`/`--slot-success` nei due temi, invece di colori fissi.
- Nei form account il testo di errore/successo usa ora i token semantici invece di colori fissi; la resa dei nuovi controlli Ionic richiede ancora una prova visiva nei due temi.
- Nei filtri Segnalazioni admin e nel pulsante di salvataggio il testo sul colore primario usa `--ion-color-primary-contrast`, distinto per tema; la tabella Prenotazioni admin mantiene colonne leggibili con scorrimento interno quando lo spazio è ristretto. Le prove desktop con API simulata sono riuscite, ma mobile, safe area e accessibilità visiva completa restano da verificare.
- **Rifinitura semantica del 10 ottobre:** messaggio informativo dei form account e messaggio di errore/focus del dettaglio prenotazione usano `--slot-warning`, `--slot-danger` e `--slot-primary-soft` al posto di colori fissi. La verifica dei due temi in Chrome per il dettaglio resta da eseguire.
- **Viewport mobile verificato il 10 ottobre:** Google Chrome headless con emulazione CDP `390×844` ha restituito `innerWidth=390` e `scrollWidth=390` su Recupero password e Registrazione, senza overflow orizzontale; il login aperto dalla guardia di `/bookings/1` conserva le stesse misure. Questo copre quelle route pubbliche e il redirect, non il dettaglio autenticato né le viste admin su mobile. Safe area iOS reale ancora pendente.
- **Viewport autenticato, tranche 10 ottobre:** in Google Chrome a `390×844`, con API e sessioni fittizie locali, Avvisi admin e `/bookings/1` autenticato hanno `scrollWidth=390` senza overflow. Il dettaglio mostra data, fascia, partecipanti e azioni etichettate; il menu admin diventa un pulsante apribile. Questa prova copre due viste mirate, non tutta la matrice mobile o la safe area iOS reale.
- **Matrice admin mobile/desktop, tranche successiva:** Google Chrome con sessione admin e API simulate ha aperto tutte le nove route amministrative su desktop e a viewport effettivo `390×844`. Ogni route mantiene `scrollWidth=390` su mobile; il pulsante del menu è visibile e la sidebar desktop compare nel layout largo. La prova non copre ancora safe area iOS, tastiera completa, tutte le azioni o la compatibilità con l'API reale.
- **Decisione griglia e prova iOS, 11 ottobre:** `ion-grid` non aggiunge valore alle tabelle dense, alla mappa Leaflet o alle card già responsive con CSS Grid; l'esempio della slide è una tecnica facoltativa, non un requisito di usare ogni componente. Il wrapper Capacitor sincronizzato compila per iOS Simulator e si apre su iPhone 17 Pro simulato mostrando il login con status bar e contenuto separati. La configurazione `server.url` carica il sito remoto: questa prova riguarda il wrapper e la safe area visibile, non dimostra l'esecuzione offline degli asset web incorporati né sostituisce un dispositivo fisico.

### Dipendenze e rischi

La mappatura dei token precede la migrazione estesa dei componenti dell'Area 2. La rimozione dei padding locali segue l'Area 1. Cambiare `--ion-*` globali senza prova su tutti i componenti può produrre colori o contrasti inattesi: introdurre i token per piccoli gruppi e verificare entrambi i temi.

---

## Area 6 — Copertura ragionata delle slide Angular/Ionic

### Obiettivo

Rendere evidente nel codice e nella documentazione come SlotLab applica i concetti insegnati, colmando le lacune che hanno un'utilità reale. La copertura delle slide è una verifica di architettura e capacità, non un elenco di costrutti da inserire artificialmente.

### Stato attuale e file coinvolti

Angular standalone, composizione di componenti, `@if`/`@for`, binding, `@Input`/`@Output`, servizi, guardie e router sono già presenti. Mancano Reactive Forms e pipe nei template; `ng-content` e le API `input()`/`output()` con signal non risultano usate. Le slide Ionic mostrano anche navigazione, componenti, theming, griglia, servizi e opzioni Capacitor: molte di queste aree sono coperte solo parzialmente dall'interfaccia corrente. Manifest e service worker PWA sono già configurati; Capacitor e il progetto iOS esistono, ma non risultano plugin nativi usati nel frontend.

| Materiale | Argomento | Stato iniziale | Area che lo tratta |
| --- | --- | --- | --- |
| Angular, pp. 41–45 | Routing e outlet | Presenti; layout ripetuto | 1 |
| Angular, pp. 47–52 | Form e validazione | Template-driven presenti; Reactive Forms assenti | 3 |
| Angular, pp. 53–54 | Pipe | Assenti nei template | 6 |
| Angular, pp. 55–57 | Servizi | Presenti, ma API spesso nelle pagine | 4 |
| Ionic/Angular, pp. 5–9 | Navigazione, componenti, tema | Integrazione presente; UI Ionic limitata | 1, 2, 5 |
| Ionic/Angular, pp. 14, 17–20 | Servizi API e griglia | Parziali | 4, 5 |

### Fasi operative

1. **Costruire una matrice slide → evidenza.** Per ogni concetto pertinente indicare pagina della slide, file o flusso del progetto, stato attuale, intervento previsto e verifica. Distinguere chiaramente: già presente; da rafforzare; esempio facoltativo; non pertinente all'architettura scelta.
2. **Colmare le lacune utili.** Documentare il form reattivo introdotto nell'Area 3 e usare pipe Angular predefinite, per esempio `DatePipe` o `CurrencyPipe`, dove oggi una semplice formattazione viene rifatta nel TypeScript senza esigenze particolari. Inserire una pipe personalizzata solo se esiste una trasformazione riutilizzata e adatta a una pipe pura.
3. **Valutare composizione avanzata su casi reali.** `ng-content` può entrare in un componente condiviso con struttura stabile e contenuto variabile, se la migrazione UI mostra un caso ripetuto. Le API signal `input()`/`output()` possono essere adottate in un componente nuovo o rifattorizzato, ma `@Input`/`@Output` esistenti restano Angular corretto e non richiedono una sostituzione generale.
4. **Collegare ogni dimostrazione al comportamento.** Preparare percorsi riproducibili: cambio route nell'outlet, comunicazione padre/figlio, form con validazione, servizio API iniettato, stato Ionic e tema/griglia. Per ogni percorso indicare cosa osservare in interfaccia e nel codice.
5. **Verificare PWA e destinazione mobile.** Controllare nella build di produzione manifest, icone, registrazione e aggiornamento del service worker e apertura diretta delle route. Se la distribuzione iOS/Capacitor fa parte della consegna, verificare separatamente build nativa, safe area e collegamento al server; scegliere un plugin solo in presenza di una funzione nativa richiesta. Non aggiungere geolocalizzazione alla mappa Leaflet senza un caso d'uso e la relativa gestione dei permessi.
6. **Rivedere gli argomenti facoltativi.** Bootstrap non è necessario in un'interfaccia Ionic; SSR non è richiesto dalla configurazione SPA/PWA corrente. Le API Angular alternative non impongono la riscrittura dei componenti esistenti. Non introdurre elementi delle slide esclusivamente per poterli spuntare.

### Criteri di completamento

- La matrice collega i concetti pertinenti delle due presentazioni a file e flussi funzionanti.
- Reactive Forms, pipe utili, servizi di funzionalità e componenti Ionic hanno esempi verificabili nel prodotto.
- La PWA di produzione è verificata; Capacitor è verificato separatamente se la distribuzione nativa è prevista.
- Le differenze rispetto agli esempi didattici sono spiegate con motivi tecnici concreti, soprattutto per tab, pagine a schermo intero, Bootstrap, SSR e API Angular alternative.
- Il progetto resta coerente: nessun componente o plugin dimostrativo privo di scopo.

### Dipendenze e rischi

Questa area raccoglie evidenze dalle Aree 1–5 e si chiude dopo la loro verifica. Confondere un esempio della slide con un requisito può portare a codice superfluo; la matrice deve indicare cosa è richiesto al progetto e cosa è solo una possibile tecnica.

### Avanzamento dell'Area 6 — 10 ottobre 2026

La prima matrice slide → file/flusso → verifica è qui sotto; i numeri indicano le pagine dei PDF locali. `DatePipe` è ora usata nel filtro data di Prenotazioni admin al posto di `split`/`reverse` nel template e il test conferma il formato `dd/MM/yyyy`. La build di produzione contiene manifest, otto icone referenziate esistenti, `ngsw-worker.js` e `ngsw.json` con gruppi `app` e `assets`: è una verifica degli **asset generati**, non ancora di installazione/aggiornamento della PWA nel browser. L'Area 6 **non è completata**.

**Prova PWA runtime del 10 ottobre:** Google Chrome ha caricato il manifest e la build di produzione servita su localhost con fallback SPA. `/forgot-password` si è aperta e ricaricata online; dopo l'arresto del server statico la stessa route si è ricaricata offline e `/register` si è aperta offline tramite application shell. Le chiamate API hanno mostrato lo stato di connessione assente. Questa prova indica che il service worker serve gli asset in cache, ma non verifica installazione, aggiornamento tra versioni, dati API offline o dispositivo iOS; non è stata letta direttamente l'API `navigator.serviceWorker` dal connettore. L'Area 6 **non è completata**.

**Prove aggiuntive dell'11 ottobre:** Chrome ha esposto “Installa SlotLab” per la build locale; l'installazione ha creato una finestra PWA separata con il login, poi la copia di prova è stata rimossa. Il service worker Angular era già stato osservato attivo, con cache di app/assets e aggiornamento a una seconda build tramite `registration.update()`; la shell ha funzionato offline. `npx cap sync ios` e `xcodebuild` per iOS Simulator sono riusciti; il wrapper avviato nel simulatore iPhone 17 Pro ha mostrato il login e una safe area visivamente corretta. In quella prova il wrapper caricava un sito remoto; successivamente `server.url` è stato rimosso per includere gli asset web locali. Una distribuzione nativa pienamente funzionante richiede ancora una decisione sull'API: la risposta al preflight dall'origine `capacitor://localhost` non include `Access-Control-Allow-Origin`. Non dichiarare verificati i flussi API nativi o un dispositivo fisico.

| Slide (pagine PDF) | Concetto | Evidenza SlotLab | Verifica e residuo |
| --- | --- | --- | --- |
| Angular 7–18 | Componenti, template esterni, composizione | `app.component.ts/html`, `space-card/`, `space-list-item/` e pagine standalone | Test dei componenti e build; pattern usato nel prodotto |
| Angular 19–22 | Lifecycle | `bookings.page.ts`, `admin-bookings.page.ts` e `admin-statistics.page.ts` distinguono inizializzazione, rientro e distruzione | Test su rientro/annullamento; altre pagine admin da verificare nei percorsi finali |
| Angular 23–30 | `@if`, `@for`, `track`, binding ed eventi | `admin-bookings.page.html`, `admin-reports.page.html`, `spaces.page.html` | Test su filtri, eventi Ionic e dati visualizzati |
| Angular 33–40 | `@Input`, `@Output`, comunicazione padre/figlio | `booking-filters.component.ts`, `space-card.component.ts`, `campus-map.component.ts` | Test input/output; `input()`/`output()` signal e `ng-content` sono alternative facoltative, da introdurre solo con un caso concreto |
| Angular 41–45 | Router, outlet e navigazione senza reload | `app.component.html`, `app.routes.ts`, `main.ts`, `mobile-navigation/` | Area 1 verificata con route dirette, guardie e cambio sezione nel browser; outlet unico motivato dalle route di dettaglio condivise |
| Angular 46–52 | Two-way binding, form template-driven e reattivi | `report-create/`, `auth/access.page.ts`, `booking/`, `admin-availability/` | Test di validazione/payload; restano accessibilità e prova visiva completa dei form |
| Angular 53–54 | Pipe integrate e personalizzate | `admin-parts/booking-filters.component.html` usa `DatePipe` | Test del formato `dd/MM/yyyy`; nessuna trasformazione riusata richiede oggi una pipe custom |
| Angular 55–57; Ionic 14 | Servizi, iniezione e API | `api/spaces-api.ts`, `bookings-api.ts`, `reports-api.ts`, `notifications-api.ts`, servizi admin, `password-recovery-api.ts`; `auth/auth.ts` | Test su URL, mapping e payload; percorso prenotazione e letture admin provati con API reale su database temporaneo |
| Angular 58 | Classi condizionali | `[ngClass]` in `admin-bookings.page.html` e `[class.*]` nelle altre pagine | Test di stato e build |
| Ionic 3–4, 13, 21–24 | PWA e opzione nativa delle slide | `main.ts`, `ngsw-config.json`, `public/manifest.webmanifest` | Installazione effettiva in Chrome, update e shell offline verificati. La precedente prova Capacitor in simulatore è storica: la piattaforma nativa è stata poi rimossa su richiesta, perché il prodotto richiesto è il sito per browser. |
| Ionic 5–8 | Pagine, componenti e tema | `app.component.html`, `admin-reports/`, `admin-bookings/`, `src/theme/variables.scss` | Componenti Ionic e due temi provati su vari flussi; uniformità visiva/mobile resta Area 2/5 |
| Ionic 9–12 | Route parametriche, wildcard e guardie | `app.routes.ts`, `auth/admin-guard.ts`, `auth/session-guard.ts` | Test routing/ruoli; la wildcard torna alla landing coerente con la sessione |
| Ionic 15–16 | Leaflet e geolocalizzazione | `campus-map/` usa Leaflet | Mappa presente; posizione utente e permessi nativi sono facoltativi senza un caso d'uso richiesto |
| Ionic 17–20 | Griglia `ion-grid`/`ion-row`/`ion-col` | Layout attuali a CSS Grid/tabelle per dashboard e dati densi | Valutata: CSS Grid mantiene card responsive e tabelle leggibili; introdurre `ion-grid` qui aggiungerebbe markup senza cambiare il comportamento. La slide lo presenta come opzione di layout, non come obbligo |
| Angular 31–32; Ionic 5 | Bootstrap, SSR e template a tab | SPA Angular/Ionic con outlet unico e CSS del progetto | Esempi facoltativi: Bootstrap/SSR non richiesti; `ion-tabs` evitato dopo il prototipo dell'Area 1 per non separare gli stack dei dettagli condivisi |

**Percorsi dimostrabili già disponibili:** cambio Home → Spazi → Prenotazioni nello stesso outlet (`app.component.html` e `app.routes.ts`); ricerca e filtri Ionic (`space-search/`, `admin-parts/booking-filters.component.ts`); form reattivo con errori (`auth/access.page.ts`); servizio API iniettato (`spaces.page.ts` → `SpacesApi`); tema (`src/theme/variables.scss`). Restano da ripetere come matrice finale su Chrome, mobile e PWA di produzione prima di dichiarare l'Area 6 conclusa.

---

## Area 7 — Verifica finale e controllo regressioni

### Obiettivo

Confermare che la migrazione frontend funzioni come applicazione Angular/Ionic completa e che i miglioramenti visivi non interrompano autenticazione, prenotazioni o amministrazione.

### Stato attuale e file coinvolti

Il repository dispone di build, lint e test Angular. Una verifica precedente ha rilevato due test di `bookings.page.spec.ts` dipendenti da date fisse di settembre 2026, ormai passate rispetto alla data corrente; questo difetto preesistente va corretto e distinto dalle regressioni della migrazione. Sono presenti test per routing e componenti di navigazione che andranno adeguati quando cambia la struttura.

### Fasi operative

1. **Fissare la baseline prima del codice.** Registrare esito di build, lint, typecheck e test; annotare i test già instabili. Correggere le date fisse dei test prenotazioni quando si inizia il lavoro di implementazione, usando un tempo controllato dal test.
2. **Verificare ogni tranche.** Dopo ciascuna area eseguire i controlli pertinenti e testare manualmente i flussi toccati; evitare di rimandare i problemi di route o CSS alla fine.
3. **Eseguire la matrice end-to-end dei percorsi.** Coprire accesso e registrazione; Home → Spazi → dettaglio → prenotazione → conferma; Prenotazioni → dettaglio; Preferiti; Segnalazioni; Notifiche; Profilo; tutte le nove voci admin; logout; URL diretti, refresh, guardie, back/forward e cambio ruolo.
4. **Verificare stati e dispositivi.** Ripetere i percorsi principali su mobile, tablet e desktop, tema chiaro/scuro e tastiera; se è prevista la distribuzione nativa, includere iOS/Capacitor. Controllare loading, vuoto, errore, successo, menu, overlay, safe area e pagine conservate nello stack Ionic. Nella build PWA di produzione controllare installazione, aggiornamento e refresh su route annidate.
5. **Chiudere la documentazione.** Aggiornare la matrice dell'Area 6 con evidenze finali, decisione su tabs/outlet, compromessi rimasti e comandi per riprodurre la verifica.

### Criteri di completamento

- Build, lint, typecheck e suite test passano senza regressioni introdotte dal frontend.
- I flussi principali sono percorribili da URL diretto e tramite navigazione, con ruoli e guardie corretti.
- La UI è usabile su viewport e temi previsti, inclusi errori, stato di caricamento e navigazione con tastiera.
- Le differenze residue rispetto alle slide sono documentate e motivate.

### Dipendenze e rischi

La verifica attraversa tutte le aree e chiude il lavoro. I due test con date fisse sono una baseline nota, non una prova che la futura migrazione causi quei fallimenti. Una build riuscita da sola non verifica stack Ionic, accessibilità o percorsi utente.

### Avanzamento dell'Area 7 — 10 ottobre 2026

Il gate dopo le tranche admin del 10 ottobre passa: **217 test in 53 file**, build di produzione, lint, typecheck e `git diff --check`. I test con date fisse sono stati corretti in una tranche precedente. Sono state eseguite prove browser parziali delle sezioni utente e dei pannelli admin; le ultime viste Prenotazioni/Segnalazioni/Dashboard/Statistiche sono state riprovate in **Google Chrome** con API simulata locale, su desktop in tema scuro. Mancano ancora matrice completa dei percorsi, nuovi form account/Avvisi, mobile e tema chiaro in Chrome per gli ultimi pannelli, PWA installazione/aggiornamento e dispositivo iOS reale. La build segnala ancora budget SCSS, Browserslist e dipendenze CommonJS Leaflet/QRCode. L'Area 7 **non è completata**.

**Verifica aggiuntiva del 10 ottobre:** 218 test in 53 file, build di produzione, lint, typecheck e `git diff --check` passano dopo le ultime correzioni; nessuna modifica backend. In Google Chrome con API simulate sono stati aperti Avvisi admin, dettaglio prenotazione utente, cambio password ed eliminazione account; Avvisi e dettaglio sono stati osservati nei temi chiaro/scuro. La pubblicazione simulata e la resa della checkbox sono state ricontrollate nei due temi dopo i fix. La build servita localmente ha richiesto manifest, `ngsw-worker.js` e `ngsw.json`; questo non prova ancora installazione/aggiornamento né funzionamento offline. Il controllo viewport di Chrome in questa sessione non ha applicato in modo affidabile 390 px: mobile delle viste appena trattate e dispositivo iOS reale restano aperti. Sono rimasti i warning di budget SCSS, Browserslist e CommonJS. L'Area 7 **non è completata**.

**Gate dopo la rifinitura Avvisi:** 222 test in 54 file, build, lint, typecheck e `git diff --check` riusciti; backend invariato. I test mirati confermano che l'invio locale invalido non raggiunge l'API, mostra due errori di campo senza messaggio globale duplicato e conserva il messaggio globale per gli errori del server. Restano i warning già noti di budget SCSS, Browserslist e CommonJS. La prova manuale in Chrome di questa specifica rifinitura è ancora aperta; l'Area 7 **non è completata**.

**Verifica Chrome mirata del 10 ottobre:** a viewport effettivo `390×844`, il form Avvisi admin con titolo e messaggio composti solo da spazi mostra esattamente due errori associati ai campi, nessun alert globale duplicato e nessuna richiesta HTTP. Il dettaglio prenotazione autenticato `/bookings/1` mostra contenuti e controlli senza overflow orizzontale né errori runtime in console. Le prove usano sessioni e API fittizie locali: non dimostrano integrazione con l'API reale. La matrice completa resta aperta.

**Gate dopo l'estrazione API Statistiche e Dashboard:** **229 test in 56 file**, build di produzione, lint, typecheck e `git diff --check` riusciti; backend invariato. Permangono gli avvisi di budget SCSS, Browserslist e CommonJS già noti. L'Area 7 **non è completata**.

**Gate dopo il feedback Dashboard:** **230 test in 56 file**, build di produzione, lint, typecheck e `git diff --check` riusciti; backend invariato. La prova PWA in Chrome copre refresh online e offline di route annidate con application shell; installazione e aggiornamento restano aperti. Permangono gli avvisi di budget SCSS, Browserslist e CommonJS. L'Area 7 **non è completata**.

**Gate dopo Prenotazioni e Segnalazioni admin:** **235 test in 58 file**, build di produzione, lint, typecheck e `git diff --check` riusciti; backend invariato. Le nuove prove del servizio Prenotazioni coprono paginazione, mapping, errore e annullamento; quelle di Segnalazioni coprono lista, PATCH e foto. La matrice browser admin è ancora in corso. Permangono i warning già noti di budget SCSS, Browserslist e CommonJS; l'Area 7 **non è completata**.

**Ricontrollo Dashboard in Chrome:** sulla build aggiornata, sessione admin fittizia e viewport effettivo `390×844`, `/admin` mostra riepilogo e stati vuoti di prenotazioni/spazi, con menu mobile, `scrollWidth=390` e nessun errore runtime in console. Il mock non verifica l'API reale e la prova non copre ancora il retry visuale, la matrice completa o iOS.

**Matrice amministrativa in Google Chrome:** le nove route `/admin`, `/admin/announcements`, `/admin/spaces`, `/admin/reports`, `/admin/bookings`, `/admin/statistics`, `/admin/users`, `/admin/buildings` e `/admin/availability` sono state aperte direttamente senza sessione: tutte hanno raggiunto `/login` con il rispettivo `returnUrl`. Con sessione admin e API simulate, tutte hanno caricato il layout condiviso e i contenuti principali su desktop e su mobile `390×844`; su mobile ciascuna aveva `scrollWidth=390`, menu inizialmente chiuso e pulsante di apertura visibile. Non sono emersi errori applicativi in console; il mock non aveva la foto profilo opzionale e ha prodotto solo il relativo 404. Sono ancora aperti test di azioni, refresh autenticato, tastiera, temi su tutte le viste, API reale e dispositivi iOS. L'Area 7 **non è completata**.

**Gate dopo Disponibilità e Utenti admin:** **242 test in 60 file**, build di produzione, lint, typecheck e `git diff --check` riusciti; backend invariato. Restano i warning già noti di budget SCSS, Browserslist e CommonJS. La matrice Chrome dei flussi utente è in corso; questo gate non prova l'integrazione con l'API reale. L'Area 7 **non è completata**.

**Matrice utente parziale in Google Chrome, desktop `1728×880`:** con sessione e API simulate sono riusciti login e redirect a Home; Home → Spazi senza ricarica; apertura diretta del dettaglio spazio con stato di errore e ritorno; lista Prenotazioni vuota, dettaglio `/bookings/1`, refresh e ritorno; back/forward tra Registrazione e dettaglio; caricamento di Preferiti e Notifiche con errore e retry; Profilo con tema, account e link alle Segnalazioni; Segnalazioni vuote e logout con redirect al login. La Registrazione mostra validazione vuota; l'invio compilato arriva al mock, che risponde con errore perché non implementa l'endpoint. Il mock non implementa lista/disponibilità spazi, preferiti e notifiche: il percorso Spazi → prenotazione → conferma e i relativi stati di successo non sono verificati. Il mock di refresh ripristina sempre la sessione, perciò non dimostra la guardia dopo logout. Questa prova non copre viewport mobile, API reale, tastiera, PWA installazione/aggiornamento o iOS; per mobile valgono le precedenti evidenze specifiche. L'Area 7 **non è completata**.

**Controllo mirato admin in Google Chrome:** con sessione e API simulate, `/admin/availability` mostra lo spazio, la fascia attiva e i due form; `/admin/users` mostra utente normale eliminabile e amministratore con azione disabilitata. Il tentativo di aggiungere una fascia non ha prodotto una nuova riga né un errore osservabile: la mutazione non è considerata verificata. Il click su “Elimina” non ha rimosso l'utente fittizio e la finestra nativa di conferma non era osservabile nello strumento; nessuna eliminazione è dichiarata verificata. Non sono stati toccati dati reali.

**Gate dopo Spazi admin:** **245 test in 61 file**, build di produzione, lint, typecheck e `git diff --check` riusciti; backend invariato. Restano gli avvisi già noti di budget SCSS, Browserslist e CommonJS. L'Area 7 **non è completata**.

**Audit integrazione API reale:** il proxy frontend punta a `127.0.0.1:3000`, ma il server non è attivo. Il database operativo backend è a migrazione 6 mentre il codice contiene anche 7 e 8; avviare il server comporterebbe modifiche persistenti ai dati. Per rispettare il perimetro frontend non è stato avviato. La compatibilità con l'API reale resta non verificata; occorre un ambiente demo isolato già predisposto o una decisione esplicita sull'uso dell'ambiente backend. Nessun file backend è stato modificato.

**Ambiente demo API isolato:** migrazioni 1–8, seed iniziale e seed demo sono stati eseguiti su un database nuovo in `/private/tmp`, separato da quello operativo. Anche l'upload punta a `/private/tmp`; il server è stato avviato sulla porta 3100 e il frontend sulla 4201 con un proxy temporaneo esterno al repository. Nessun file o database backend del repository è stato modificato.

**Percorso reale in Google Chrome con database demo isolato:** registrazione dell'utente fittizio via API; login dalla UI; Home → Spazi (3 risultati) → dettaglio Aula Studio A1 → Prenotazione, selezione dell'11 ottobre con tre fasce reali → conferma salvata (prenotazione demo #25) → elenco Prenotazioni → dettaglio/partecipanti → refresh dell'URL `/bookings/25` riuscito. Logout e successivo login admin dalla UI sono riusciti; Dashboard e liste Utenti, Spazi, Edifici e Disponibilità hanno caricato dati del server reale. In Disponibilità admin, una nuova eccezione fittizia del 12 ottobre 18:00–20:00 è comparsa dopo il POST e il refresh. I dialoghi `ion-alert` di Utenti, Spazi ed Edifici sono stati aperti in Chrome e annullati senza eliminare dati. Nessun errore runtime è stato rilevato nella console della sessione. Queste prove usano il codice API reale e un database temporaneo, non il database operativo né un dispositivo iOS.

**PWA in Google Chrome, verifica aggiuntiva:** manifest letto con `display: standalone`, icone presenti e nessun errore di installabilità; service worker Angular `/ngsw-worker.js` attivato, cache app/assets presenti. Una seconda build temporanea ha prodotto un nuovo hash e, dopo `registration.update()`, la nuova shell è stata servita; offline la pagina di login mostra il messaggio di backend non disponibile. L'installazione effettiva è ancora da distinguere dall'installabilità. Il server statico della prova non aveva fallback SPA: una route profonda ricaricata prima del controllo del service worker dava 404, perciò il server di distribuzione deve riscrivere tali URL verso `index.html`.

**Gate dopo le conferme Ionic:** **248 test in 61 file**, build di produzione, lint, typecheck e `git diff --check` riusciti; backend del repository invariato. Restano gli avvisi già noti su budget SCSS, Browserslist e CommonJS. L'Area 7 **non è completata**.

**Matrice aggiuntiva in Google Chrome, 11 ottobre:** sul database demo isolato, login admin, Dashboard con dati reali, navigazione delle nove voci, lista Spazi e dialog `ion-alert` di eliminazione con chiusura tramite `Escape` sono riusciti senza eliminare dati. Il focus attraversa tema e profilo; il tema chiaro è stato controllato visivamente e poi ripristinato a scuro. I controlli mobile `390×844` delle nove route admin e del dettaglio prenotazione restano quelli documentati nelle tranche precedenti: in questo nuovo giro l'estensione Chrome non ha applicato un override affidabile del viewport. Il percorso utente principale con prenotazione reale e refresh diretto rimane verificato dalla prova precedente. È in corso un ultimo controllo dei flussi secondari.

**PWA, hosting e iOS, 11 ottobre:** Chrome ha installato davvero la build locale come finestra PWA separata, aperta sul login; la copia di prova è stata poi rimossa. La prova precedente aveva già verificato aggiornamento del service worker e application shell offline. In una precedente prova su hosting remoto, un URL annidato ha restituito `200` e l'API ha restituito JSON `401`; ciò documentava fallback SPA e proxy API di quell'hosting, non la configurazione locale. Una regola locale generale `/* /index.html 200` è stata provata nella build e poi rimossa perché poteva intercettare `/api/v1` senza una configurazione di proxy adeguata. `npx cap sync ios`, compilazione iOS Simulator e apertura su iPhone 17 Pro simulato sono riusciti; il login e la safe area erano visibili. Quella prova usava un sito remoto; dopo la rimozione di `server.url`, gli asset vengono incorporati, ma flussi API nativi e dispositivo fisico restano da verificare se una distribuzione iOS sarà richiesta.

**Gate globale dopo le ultime estrazioni frontend:** **256 test in 66 file**, lint, typecheck, build di produzione e `git diff --check` riusciti. `npx cap sync ios` e la ricompilazione iOS Simulator sulla build aggiornata sono riusciti. Nessun file backend o iOS tracciato è stato modificato. Restano gli avvisi preesistenti di budget SCSS, Browserslist e dipendenze CommonJS Leaflet/QRCode; non hanno causato errori di build. L'Area 7 non è ancora chiusa finché il controllo finale dei flussi secondari e il perimetro della distribuzione nativa non sono chiariti.

**Ultima matrice Chrome e perimetro confermato:** con API reale e database demo in `/private/tmp`, Preferiti è passato da vuoto ad uno spazio aggiunto dalla lista e di nuovo a vuoto dopo rimozione; Notifiche ha mostrato correttamente lo stato vuoto e l'azione disabilitata; Segnalazioni ha aperto lista vuota e form con spazio corretto; Profilo ha mostrato dati e destinazioni account. Registrazione tramite UI è riuscita con un utente fittizio e ha restituito `/login?registered=1` con il messaggio di successo; login/logout e prenotazione reale erano già verificati. In Chrome a viewport effettivo **390×844**, Home, Spazi, Prenotazioni, Preferiti, Segnalazioni, Notifiche, Profilo, dettaglio spazio, form prenotazione e nuova segnalazione hanno `scrollWidth=390`; a **768×1024**, Home, Spazi, form prenotazione e Profilo hanno `scrollWidth=768`. Il tema chiaro è stato osservato su Profilo mobile e il tema scuro ripristinato; il viewport Chrome è stato ripristinato. Le nove route admin erano state controllate a 390 px nella matrice precedente e nuovamente su desktop con API reale. Nessun bug è emerso nei percorsi finali. L'utente ha chiarito che la consegna è il sito responsive, non una app iOS distribuibile.

---

## Sequenza proposta e punti di decisione

| Ordine | Lavoro | Risultato verificabile prima di proseguire |
| --- | --- | --- |
| 0 | Baseline e inventari di route, UI, form, HTTP e token | Matrici e test di partenza registrati |
| 1 | Area 1: prototipo Home/Spazi/Prenotazioni | Scelta motivata tra tab Ionic e outlet condiviso; back/deep link corretti |
| 2 | Area 5: token Ionic di base, insieme alla UI pilota dell'Area 2 | Due temi corretti sui primi componenti migrati |
| 3 | Area 1: completamento layout utente/admin; Area 2: componenti principali | Navigazione unica per area, controlli Ionic nei flussi pilota |
| 4 | Area 4: servizi per domini; Area 3: form pilota e poi form complessi | Stessi contratti HTTP, validazioni e stati verificati |
| 5 | Aree 2 e 5: pagine restanti, feedback, responsive e pulizia CSS | Interfaccia coerente su mobile, tablet e desktop |
| 6 | Aree 6 e 7: matrice slide e regressione completa | Evidenze dimostrabili, test e percorsi principali validati |

**Decisione Area 1:** usare un outlet unico con navigazione condivisa e cronologia lineare. Il layout utente e quello admin sono stati migrati. **Checkpoint precedente:** Disponibilità admin aveva chiuso il gate con 209 test in 52 file, build, lint e typecheck riusciti. La cache persistente Angular è disabilitata in `angular.json` perché il processo nativo LMDB abortiva la build su questo host; la build con cache disabilitata passa. I servizi `SpacesApi`, `BookingsApi`, `ReportsApi`, `NotificationsApi` e `ProfilePhoto` coprono i domini utente finora migrati.

**Tranche chiuse il 10 ottobre dopo Disponibilità:** Prenotazioni admin (filtri, stati e azioni Ionic, tabella HTML), Segnalazioni admin (segmento/lista/stato/salvataggio Ionic, retry, foto), Dashboard admin (ricerca/azioni Ionic) e Statistiche admin (azioni/spinner Ionic). La prima matrice delle slide è registrata nell'Area 6; `DatePipe` è usata nel filtro date e gli asset PWA sono stati controllati nella build. **Gate finale di questa sessione:** 217 test in 53 file, build, lint, typecheck e `git diff --check` riusciti; prova mirata in Google Chrome su desktop con API simulata; backend invariato. La stima sale indicativamente al **70%**, senza dichiarare complete Aree 2–7. **Prossimo passo:** completare le prove responsive/accessibilità in Chrome e i flussi account/Avvisi/dettaglio prenotazione, poi valutare API admin, griglia dove utile, PWA runtime e matrice finale dei percorsi. Il progetto non è completato.

**Checkpoint intermedio del 10 ottobre — 72% stimato:** corretti il blocco esplicito dei controlli Ionic nei form account durante l'invio e tre colori fissi nei form account/dettaglio prenotazione; 7 test mirati account riusciti. È in corso la prova Chrome dei flussi e dei due temi. Backend invariato.

**Checkpoint intermedio del 10 ottobre — 74% stimato:** Chrome con API simulate ha attraversato Avvisi admin, dettaglio prenotazione utente, cambio password ed eliminazione nei temi chiaro/scuro; sono emersi un reset incompleto del form Avvisi dopo pubblicazione e la checkbox di eliminazione troncata. Entrambi sono corretti nel codice; 10 test mirati account/Avvisi passano. Il gate completo a 218 test, build, lint e typecheck era passato prima di queste ultime due correzioni, quindi va ripetuto. La build di produzione in Chrome ha richiesto `ngsw-worker.js`, `ngsw.json` e manifest, ma installazione, aggiornamento e refresh offline non sono ancora verificati. **Prossimo passo:** ricontrollare i due difetti in Chrome e ripetere il gate completo, poi fermarsi al checkpoint richiesto del 75% se tutto passa. Backend invariato.

**Checkpoint chiuso del 10 ottobre — 75% stimato:** il ricontrollo in Google Chrome nei temi chiaro/scuro conferma che la pubblicazione di Avvisi non lascia errori sui campi e che la label di eliminazione account è interamente leggibile. Il gate completo dopo i fix passa: **218 test in 53 file**, build, lint, typecheck e `git diff --check`; backend invariato. La stima sale di cinque punti dal precedente 70% per la rifinitura verificata dei form account, la semantica del tema, la prova dei flussi protetti e i due difetti scoperti e risolti in Chrome. **Lavoro ancora aperto:** mobile/tablet reale o viewport Chrome affidabile per le ultime viste, prova accessibilità/tastiera completa, API admin e refresh, valutazione griglia Ionic, PWA installazione/aggiornamento/route offline, matrice finale dei percorsi e iOS reale. **Prossimo passo alla ripresa:** partire dalla resa mobile e dai flussi con API reale o mock stabile, poi continuare secondo le dipendenze delle Aree 2–7. Il progetto non è completato; il lavoro si ferma qui come richiesto.

**Checkpoint intermedio del 10 ottobre — 77% stimato:** `AdminBuildingsApi` copre lista, creazione, modifica ed eliminazione con contratti HTTP invariati e test dedicati; la pagina usa il servizio. Nel dettaglio prenotazione l'errore email è annunciato una sola volta sul campo, senza richiesta HTTP. Passano 11 test mirati in 3 file; build, lint e typecheck della tranche Edifici passano. **In corso:** prova mobile effettiva in Google Chrome delle viste recenti e gate globale finale. **Prossimo passo:** documentare l'esito mobile, correggere eventuali difetti e fermarsi al 78% solo dopo verifica. Backend invariato.

**Checkpoint chiuso del 10 ottobre — 78% stimato:** il gate dopo le due tranche passa: **222 test in 54 file**, build, lint, typecheck e `git diff --check`; backend invariato. Google Chrome headless ha verificato un viewport effettivo di `390×844` su `/forgot-password` e `/register` senza scorrimento orizzontale; `/bookings/1` porta a `/login?returnUrl=%2Fbookings%2F1` e il login resta entro i 390 px. Non è stata provata la vista autenticata del dettaglio su mobile, né le ultime viste admin mobile. **Lavoro ancora aperto:** API admin restanti e loro refresh, prove mobile autenticate e tastiera, griglia Ionic dove utile, PWA installazione/aggiornamento, matrice finale dei percorsi e dispositivo iOS reale. **Prossimo passo alla ripresa:** verificare dettaglio prenotazione e pannelli admin con mock autenticato su Chrome mobile, poi proseguire con le altre API admin secondo il piano. Il progetto resta in corso; questa sessione si ferma al 78% richiesto.

**Checkpoint chiuso del 10 ottobre — 79% stimato:** Avvisi admin usa il feedback di campo per titolo e messaggio vuoti o di soli spazi, senza un alert globale ripetuto; gli errori HTTP mantengono il feedback generale e il retry. **222 test in 54 file**, build, lint, typecheck e `git diff --check` passano; backend invariato. La verifica manuale di questo caso in Google Chrome resta il primo controllo alla ripresa, seguita dalle prove mobile autenticate e dagli altri punti ancora aperti delle Aree 2–7. Il progetto non è completato.

**Checkpoint intermedio del 10 ottobre — circa 83% stimato:** `AdminStatisticsApi` e `AdminDashboardApi` separano dalla pagina cinque letture HTTP admin e i relativi mapping; la Dashboard ricarica tutti i riquadri al rientro e annulla richieste obsolete. Chrome a 390 px conferma il form Avvisi senza alert duplicato e il dettaglio prenotazione autenticato senza overflow. **229 test in 56 file**, build, lint, typecheck e `git diff --check` passano. In corso la verifica runtime della PWA in Chrome; non sono conclusi API admin residue, matrice E2E completa e iOS reale. Nessuna nuova area è dichiarata completa.

**Checkpoint intermedio del 10 ottobre — circa 84% stimato:** la Dashboard distingue caricamento, errore, retry e dati vuoti nei suoi tre riquadri; il gate aggiornato passa con **230 test in 56 file**, build, lint, typecheck e `git diff --check`. Chrome ha provato manifest e application shell della PWA su route annidate online e offline. È in corso il ricontrollo visivo della nuova Dashboard in Chrome. Restano API admin residue, installazione/aggiornamento PWA, matrice completa, accessibilità globale e iOS reale; il backend è invariato e nessuna nuova area è dichiarata completa.

**Checkpoint chiuso del 10 ottobre — circa 85% stimato:** il ricontrollo in Google Chrome a `390×844` conferma la nuova Dashboard admin, stati vuoti leggibili e nessun overflow o errore runtime. Le due estrazioni API admin, i feedback Dashboard, il controllo Avvisi, il dettaglio prenotazione mobile autenticato e la prova PWA offline sono documentati sopra. Il gate finale della tranche passa: **230 test in 56 file**, build, lint, typecheck e `git diff --check`; backend invariato. **Restano** API admin non ancora estratte, prova completa dei percorsi e dell'accessibilità, installazione/aggiornamento PWA, integrazione API reale e dispositivo iOS. **Prossimo passo alla ripresa:** proseguire dalle API admin residue e dalla matrice Chrome completa, con verifica a piccoli passi; non dichiarare complete le Aree 2–7. Il lavoro si ferma qui al checkpoint richiesto.

**Checkpoint intermedio — circa 88% stimato:** `AdminBookingsApi` e `AdminReportsApi` separano dalla UI paginazione/mapping delle prenotazioni e lista, mutazioni e foto delle segnalazioni admin. Il gate globale passa con **235 test in 58 file**, build, lint, typecheck e `git diff --check`; backend invariato. È in corso la matrice Chrome delle nove route admin e il ricontrollo browser dopo le estrazioni. Restano altri domini API admin, percorsi utente completi, accessibilità generale, installazione/aggiornamento PWA, API reale e iOS; nessuna nuova area è dichiarata completa.

**Checkpoint chiuso — circa 90% stimato:** le nove route admin sono state verificate in Google Chrome su desktop e mobile con API simulate; il redirect senza sessione conserva `returnUrl` e non compare overflow orizzontale a 390 px. Il gate dopo le estrazioni Prenotazioni/Segnalazioni admin passa: **235 test in 58 file**, build di produzione, lint, typecheck e `git diff --check`; backend invariato. L'errore transitorio `ReportStatus` visto da Chrome mentre il file Segnalazioni era in modifica non è più presente: la build finale e la navigazione delle route passano. **Restano** API admin di Spazi/Disponibilità/Utenti da valutare, matrice completa dei flussi utente e delle azioni admin, tastiera/temi/accessibilità, installazione e aggiornamento PWA, API reale e dispositivo iOS. Nessuna nuova area è dichiarata completa. **Prossimo passo alla ripresa:** continuare dalla matrice dei flussi utente e dalle API admin residue, mantenendo tranche verificate. Il lavoro si ferma qui al 90% richiesto.

**Checkpoint intermedio — circa 93% stimato:** estratte e testate le API admin di Disponibilità e Utenti; l'eliminazione utente ora blocca il doppio invio e rende visibile lo stato occupato. Il gate globale passa con **242 test in 60 file**, build, lint, typecheck e `git diff --check`; backend invariato. È in corso la matrice dei flussi utente in Google Chrome. Mancano ancora Spazi admin, azioni admin in browser, accessibilità/tastiera e temi completi, PWA installazione/aggiornamento, API reale e dispositivo iOS. Nessuna nuova area è dichiarata completa.

**Checkpoint intermedio — circa 94% stimato:** registrata la matrice Chrome desktop dei percorsi utente effettivamente percorsi; gli stati di errore delle API mancanti nel mock sono distinti dai percorsi di successo non verificati. È in corso l'estrazione dell'API Spazi admin; dopo la tranche servono test e gate globale. Nessuna nuova area è dichiarata completa.

**Checkpoint chiuso — circa 95% stimato:** `AdminSpacesApi` completa la separazione delle chiamate HTTP dei principali pannelli admin ancora aperti; il gate globale finale della tranche passa con **245 test in 61 file**, build, lint, typecheck e `git diff --check`; backend invariato. La matrice Chrome desktop utente e il controllo mirato di Disponibilità/Utenti sono registrati nell'Area 7 con i loro limiti. **Restano** il percorso completo Spazi → disponibilità → prenotazione → conferma e le mutazioni admin con API/mock affidabile; accessibilità e tastiera estese; temi/viewport completi; installazione/aggiornamento PWA; integrazione con API reale e dispositivo iOS. Nessuna nuova area è dichiarata completa; il progetto resta in corso. **Prossimo passo alla ripresa:** preparare un mock che risponda ai flussi di successo e verificare i percorsi e le mutazioni in Chrome, poi affrontare accessibilità, PWA e API reale. Il lavoro si ferma al 95% richiesto.

**Ripresa verso il completamento — tranche aperta:** sostituite le conferme native delle eliminazioni in Utenti, Edifici e Spazi con `ion-alert` e avviate verifiche Chrome del flusso utente completo e della PWA. I test mirati delle tre pagine passano; si attende il gate globale dopo l'integrazione di tutte le verifiche. L'audit dell'API reale ha individuato un blocco di ambiente documentato nell'Area 7. La stima resta al 95% fino alle verifiche conclusive.

**Checkpoint intermedio — circa 96% stimato:** il gate globale dopo i dialoghi Ionic passa con **248 test in 61 file**, build, lint, typecheck e `git diff --check`; non restano conferme native nel frontend. Il runtime PWA in Chrome ha mostrato installabilità, attivazione, aggiornamento della shell e offline; installazione effettiva in verifica. È pronto un database demo temporaneo per la prova con API reale, senza alterare quello operativo. Il flusso completo con mock e la prova nativa iOS restano aperti; nessuna area è ancora dichiarata nuova completa.

**Checkpoint intermedio — circa 97% stimato:** il percorso completo di prenotazione e il refresh del dettaglio passano in Chrome con il vero server API su un database demo isolato; login/logout utente e admin, letture admin, mutazione di Disponibilità e apertura/annullamento dei tre dialoghi Ionic sono stati osservati. Il gate automatico resta a **248 test in 61 file** più build, lint e typecheck riusciti. Restano il riscontro indipendente del mock completo, installazione PWA effettiva, tastiera/temi/viewport estesi e prova iOS/Capacitor. Il progetto resta in corso.

## Chiusura del piano — 11 ottobre 2026

PROJECT_STATUS: COMPLETED

La tabella seguente è lo **stato finale**; le frasi “non completata” nei checkpoint sopra registrano soltanto lo stato storico delle singole tranche.

| Area | Esito verificato |
| --- | --- |
| 1 — Navigazione e layout | Layout utente/admin condivisi, outlet unico, route/guardie/back/deep link e breakpoint verificati in Chrome. |
| 2 — UI Ionic | Azioni, card, liste, ricerca, filtri, form e conferme principali usano componenti Ionic; tabelle, mappa, date/ore e file nativi restano dove servono. Dialog amministrativi verificati in Chrome e tastiera. |
| 3 — Form | Form template-driven e Reactive Forms usati realmente; validazioni, payload, errori e blocco dei doppi invii coperti da test. Registrazione reale in Chrome riuscita; prenotazione e conferma reali riuscite. |
| 4 — Servizi e API | Chiamate HTTP delle pagine e della mappa estratte in servizi di funzionalità; i test coprono URL, payload, mapping, cancellazione e refresh. Percorso utente e letture/mutazione admin provati con API vera su database temporaneo. |
| 5 — Tema e responsive | Token scuro/chiaro, due temi in Chrome, mobile 390 px, tablet 768 px e desktop verificati sui flussi principali. Nessun overflow nei percorsi misurati. CSS Grid è stato mantenuto dove `ion-grid` non migliorava il layout. |
| 6 — Slide Angular/Ionic | Matrice slide → codice → prove aggiornata; esempi di router/outlet, form, pipe, servizi e componenti Ionic funzionanti. PWA installata/aperta in Chrome, aggiornata e servita offline; Capacitor provato separatamente in simulatore come verifica facoltativa. |
| 7 — Regressioni | 256 test in 66 file, build, lint, typecheck e `git diff --check` passano. Chrome ha percorso accesso/registrazione, sezioni utente, prenotazione fino alla conferma, nove route admin, logout, URL diretti, temi, tastiera, mobile e tablet. Backend del repository invariato. |

**Limiti espliciti:** il test dei viewport Chrome verifica il responsive ma non sostituisce ogni combinazione di browser e dispositivo fisico. Gli avvisi di budget SCSS, Browserslist e dipendenze CommonJS erano già presenti e non bloccano la build. La piattaforma iOS/Capacitor è stata rimossa successivamente su richiesta dell'utente; una futura integrazione nativa richiederà un lavoro separato. La consegna confermata resta il sito Angular/Ionic responsive su Mac e browser dei dispositivi collegati al server locale.

**Configurazione locale richiesta dall'utente, 11 ottobre 2026:** il sito usa `/api/v1` e il proxy Angular verso `127.0.0.1:3000`. L'esposizione del frontend sulla rete locale e la verifica effettiva del traffico API da un altro client sono parte del nuovo `PIANO-SERVER-LOCALE.md`. Il progetto mantiene soltanto il frontend Angular/Ionic web/PWA; la piattaforma iOS/Capacitor è stata rimossa dopo la chiusura delle Aree 1–7.

**Riproduzione delle verifiche frontend:** dalla radice `SlotLab/`, eseguire `npm test -- --watch=false`, `npm run lint`, `npx tsc --noEmit -p tsconfig.app.json` e `npm run build`. Per la PWA servire `www/` su `localhost` con un server che riscriva le route Angular verso `index.html`; per le API reali usare un database demo isolato con `SLOTLAB_DB_PATH` e un proxy locale. I comandi nativi citati nelle prove storiche non sono più applicabili alla configurazione corrente.

## Riferimenti tecnici

- Slide locali: `../12. Angular.pdf` (routing, form, pipe, servizi) e `../13. Ionic_Angular.pdf` (navigazione, componenti, theming, grid, servizi).
- [Navigazione Angular/Ionic](https://ionicframework.com/docs/angular/navigation) e [lifecycle Ionic](https://ionicframework.com/docs/angular/lifecycle).
- [Tabs Ionic](https://ionicframework.com/docs/api/tabs), [componenti Ionic](https://ionicframework.com/docs/components) e [theming Ionic](https://ionicframework.com/docs/theming/basics).
- [Reactive Forms Angular](https://angular.dev/guide/forms/reactive-forms) e [validazione Angular Forms](https://angular.dev/guide/forms/form-validation).
