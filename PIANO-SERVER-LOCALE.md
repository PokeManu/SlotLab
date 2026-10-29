# Piano di lavoro — esecuzione dal server locale

**Stato:** **CHIUSO — 100% delle attività applicabili**. L'utente ha escluso la prova `--external`; il funzionamento da un altro dispositivo non è dichiarato verificato.  
**Perimetro aggiornato:** solo sito Angular/Ionic e server locale. La parte iOS/Capacitor è stata rimossa per ora e potrà essere reintegrata in seguito. Il backend non è stato modificato; le altre modifiche locali esistenti sono state preservate.

## Obiettivo

SlotLab deve essere raggiungibile dal browser del Mac tramite il server frontend locale e, quando questo viene esposto alla rete, dai browser degli altri dispositivi collegati alla stessa rete. Tutte le richieste a `/api/v1` devono attraversare il proxy del frontend verso il backend avviato sul Mac. Nessun file di progetto o output generato deve mantenere un indirizzo dell'hosting remoto precedentemente usato.

Il prodotto da mantenere è il sito per i browser del Mac e dei dispositivi mobili. Ionic resta la libreria di interfaccia integrata con Angular; il suo uso nel sito non dipende da Capacitor.

## Stato osservato prima dell'esecuzione

- `src/environments/environment.ts` e `environment.prod.ts` usano entrambi `/api/v1`.
- `proxy.conf.json` inoltra `/api/**` a `127.0.0.1:3000`; il backend usa di norma quella porta e ascolta sull'interfaccia locale.
- `capacitor.config.ts` non contiene più `server.url`: la modifica è già presente nel lavoro locale e va presa in considerazione prima della rimozione del file.
- Il precedente piano frontend e `.gitignore` risultano già aggiornati nelle modifiche locali.
- La copia generata e ignorata `ios/App/App/capacitor.config.json` conserva ancora il vecchio indirizzo remoto; la rimozione della piattaforma elimina anche questa copia.
- Non risultano chiamate ai plugin Capacitor nel codice `src/`. La parte nativa comprende `ios/`, `capacitor.config.ts`, l'integrazione in `ionic.config.json` e i pacchetti `@capacitor/*` nel manifest e nel lockfile.
- Alcuni pacchetti installati in `node_modules/` contengono il nome del provider in testi propri della dipendenza. Non costituiscono configurazione o codice SlotLab e non vanno alterati a mano. La scansione finale distinguerà espressamente questi file di terze parti.

## Interventi concordati

**Pesi del piano iniziale:** inventario 10%, rimozione iOS 20%, rimozione integrazione Capacitor 20%, pulizia riferimenti e documentazione 10%, prova locale sul Mac 20%, prova LAN 10%, verifica finale 10%. Dopo il checkpoint dell'80%, l'utente ha chiesto di omettere la prova LAN e completare i test restanti. Il 100% indica quindi tutte le attività applicabili al perimetro così aggiornato, senza attribuire un esito alla prova omessa.

1. **Fotografare lo stato locale.** Rileggere `git status`, confrontare i file interessati e fare una ricerca nei file tracciati, non tracciati e generati, inclusi quelli ignorati. Non ripristinare né sovrascrivere il lavoro già presente.
2. **Rimuovere la piattaforma iOS.** Eliminare `ios/`, inclusi i file tracciati e quelli generati/ignorati, dopo aver verificato che non contenga modifiche locali indipendenti da preservare. Non toccare codice o dati backend.
3. **Rimuovere l'integrazione Capacitor non usata dal sito.** Eliminare `capacitor.config.ts`, l'integrazione in `ionic.config.json` e i pacchetti `@capacitor/*` non usati dal manifest e dal lockfile. Conservare `@ionic/angular`, Ionic CLI/toolkit e tutti i componenti web. Verificare che non rimangano import o script dipendenti dalla parte rimossa.
4. **Pulire i riferimenti residui di SlotLab.** Rimuovere eventuali indirizzi o nomi del precedente hosting nei file di progetto, nella documentazione e negli output generati. Aggiornare il piano frontend per distinguere le vecchie prove iOS dalla configurazione attuale, senza falsificare la storia delle verifiche.
5. **Verificare il Mac.** Avviare backend e frontend locali; controllare apertura della home, route diretta con refresh e risposta API tramite il proxy. Provare almeno accesso e navigazione principale con dati di prova, senza toccare il database operativo.
6. **Verificare la rete locale — omesso su indicazione dell'utente.** La prova prevista avrebbe richiesto di avviare il frontend con esposizione esterna e accedere a pagina e `/api/v1` dall'indirizzo LAN del Mac. L'esito non è noto; il backend può comunque restare su `127.0.0.1` grazie al proxy frontend.
7. **Eseguire il controllo finale.** Ripetere la ricerca nei file propri e generati, poi test frontend pertinenti, lint, controllo TypeScript, build e `git diff --check`. Aggiornare questo documento con esiti, limiti e comandi di avvio effettivamente verificati.

## Criteri di chiusura

- Nessun riferimento al vecchio provider o al suo dominio nei file sorgente, configurazioni, documentazione e output generati di SlotLab.
- Il sito e le API funzionano da browser sul Mac tramite server e proxy locali.
- La configurazione `/api/v1` con proxy locale è presente e verificata su `127.0.0.1`; la raggiungibilità LAN è esplicitamente esclusa dalle verifiche richieste in questa chiusura e non viene dichiarata riuscita.
- La piattaforma iOS e l'integrazione Capacitor non usata dal sito non sono più presenti nel progetto; Angular, Ionic e la PWA continuano a funzionare.
- Gli esiti delle verifiche e ogni limite residuo sono registrati qui prima di segnare il lavoro concluso.

## Limite da chiarire nella valutazione del risultato

La frase «in nessun punto del progetto» viene applicata a codice, configurazioni, documentazione e output prodotti da SlotLab. Le dipendenze installate in `node_modules/` possono contenere riferimenti testuali a molti servizi indipendentemente dall'uso che ne fa SlotLab; modificarle o cancellarle renderebbe l'installazione non riproducibile e non eliminerebbe quei testi dopo una reinstallazione.

## Registro di avanzamento

- **10% — inventario verificato:** `ios/` contiene 20 file tracciati e soltanto output generati/ignorati come aggiunte locali; non risultano modifiche tracciate nella piattaforma. `capacitor.config.ts` e `.gitignore` hanno modifiche locali pregresse da preservare nella lettura dello stato. L'unico riferimento residuo al vecchio indirizzo nei file propri o generati, esclusi i pacchetti installati, è nella configurazione iOS ignorata. Il frontend usa già `/api/v1` e il proxy locale verso `127.0.0.1:3000`.
- **30% — piattaforma iOS rimossa:** eliminata l'intera cartella `ios/`, inclusi 20 file tracciati e gli output generati ignorati. Prima della rimozione non risultavano modifiche tracciate o repository incorporati al suo interno. Il backend e il codice web non sono stati toccati in questa tranche.
- **50% — integrazione Capacitor rimossa:** eliminati `capacitor.config.ts` e la voce di integrazione in `ionic.config.json`; `npm uninstall` ha aggiornato `package.json`, `package-lock.json` e le dipendenze installate, rimuovendo i sette pacchetti diretti `@capacitor/*`. La ricerca nei manifest, `angular.json` e `src/` non trova più import o configurazioni Capacitor. `npm ls --depth=0` conferma `@angular/core@22.0.1` e `@ionic/angular@9.0.0` presenti. La build web resta da provare nel checkpoint locale.
- **60% — riferimenti puliti:** la ricerca case-insensitive in sorgenti, configurazioni, documentazione e output generati, inclusi file ignorati ma esclusi `.git` e dipendenze di terze parti, non trova più il nome o dominio del precedente hosting. Anche la ricerca nei nomi dei file è vuota. Il piano frontend precedente conserva le prove iOS come cronologia, ma indica ora chiaramente che la piattaforma è stata rimossa e che il prodotto corrente è il sito web/PWA. Un subagent ha confermato indipendentemente l'assenza di riferimenti remoti o Capacitor nel codice web. `.gitignore` è stato rifinito dopo la rimozione della vecchia voce; `git diff --check` non segnala errori. `deploy/nginx.conf.example` resta un esempio generico non utilizzato, senza riferimenti al precedente provider.
- **80% — prova locale sul Mac riuscita:** `npm run build` compila il sito web dopo la rimozione nativa; restano solo gli avvisi già noti su browser obsoleti, budget SCSS e moduli CommonJS. Backend e frontend sono stati avviati su `127.0.0.1:3000` e `127.0.0.1:4200` usando un nuovo database demo e upload isolati in `/private/tmp/slotlab-local-check.ApX8om`. Il seed ha creato 3 spazi e dati demo senza usare il database operativo. Tramite il frontend, `/` e `/spaces/1` restituiscono HTML `200`, mentre `/api/v1/spaces` restituisce JSON `401` senza sessione: il proxy locale raggiunge il backend. In Google Chrome, accesso admin al database temporaneo, dashboard con 3 spazi, navigazione a `/admin/spaces` e refresh diretto della stessa route sono riusciti. I due server di prova sono stati fermati. Una nuova scansione dei file propri/output è vuota, `git diff --check` passa e il backend del repository non ha modifiche.

- **Chiusura delle verifiche applicabili:** `npm test -- --watch=false` passa con **256 test in 66 file**; `npm run lint`, `npx tsc --noEmit -p tsconfig.app.json`, `npm run build` e `git diff --check` passano. La build contiene `manifest.webmanifest`, `ngsw.json` e `ngsw-worker.js`. La ricerca ripetuta nei file di SlotLab e negli output generati non trova riferimenti al precedente provider; `ios/` e `capacitor.config.ts` sono assenti e il backend del repository non ha modifiche. Restano solo gli avvisi di build già noti su browser non supportati, budget SCSS e moduli CommonJS Leaflet/QRCode.

**Esclusione esplicita:** su indicazione dell'utente, `--external` e l'accesso da altri dispositivi sulla LAN non sono stati provati. La prova locale su `127.0.0.1` conferma sito e proxy sul Mac, ma non dimostra la raggiungibilità dalla rete. Non restano attività richieste aperte in questo piano; un'eventuale prova LAN successiva sarà una verifica aggiuntiva.
