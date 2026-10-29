# Avvio di SlotLab da ZIP o dal branch Finale

Questa versione conserva i checksum autentici delle migrazioni storiche. I file SQL gia applicati non vanno riformattati o modificati: per modificare la struttura aggiungere una nuova migrazione.

## Requisiti
Node compatibile con i manifest (Node 24.x dalla 24.15.0, oppure Node 26.x), npm e Chrome. Estrarre prima l'archivio e aprire la cartella con package.json e angular.json in VS Code.

## Prima installazione
1. Nella cartella principale: `npm ci`.
2. Entrare in `backend` ed eseguire `npm ci`. Le dipendenze sono installate per il computer locale; non copiare node_modules da Intel ad ARM o viceversa.
3. Creare `backend/.env` dal modello `.env.example`. Generare la chiave JWT con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` e inserirla dopo SLOTLAB_JWT_SECRET=. Il valore deve essere di 64 caratteri esadecimali. Non pubblicare .env.
4. Se hai gia `backend/db/database.sqlite`, conservarlo e usare `npm run db:migrate` da backend: non sovrascriverlo, non rieseguire il seed come riparazione. Un percorso SLOTLAB_DB_PATH personalizzato in .env cambia il database selezionato.
5. Se non hai un database operativo e vuoi usare lo snapshot incluso, dal terminale dentro backend esegui `node -e "require('node:fs').copyFileSync('db/initial.sqlite','db/database.sqlite',require('node:fs').constants.COPYFILE_EXCL)"`. Il comando rifiuta di sovrascrivere un database esistente. Esegui poi `npm run db:migrate`. Lo snapshot incluso contiene il catalogo iniziale ma nessun account: per creare un amministratore configura le quattro variabili SLOTLAB_ADMIN_... ed esegui npm run db:seed come al punto 6; per un semplice utente puoi registrarti dal sito. Se conservi invece un database operativo esistente, rimangono i suoi account e le loro password. Il cambio di chiave JWT richiede un nuovo accesso.
6. In alternativa, per una nuova installazione senza snapshot, imposta in .env nome, cognome, email e password amministratore usando le variabili SLOTLAB_ADMIN_... del modello; esegui `npm run db:migrate` e `npm run db:seed`. Il seed non reimposta la password di un amministratore gia esistente. Non cancellare database con dati da conservare.
7. Primo terminale, dentro backend: `npm start`. Attendere Server in ascolto su 127.0.0.1, porta 3000.
8. Secondo terminale, nella cartella principale: `npm start`. Aprire http://localhost:4200 in Chrome. Le richieste /api sono inoltrate dal proxy al backend sulla porta 3000.

## Avvii successivi
Soltanto i due npm start, ciascuno nella propria cartella. Fermare entrambi con Ctrl+C. Non aprire index.html direttamente e non usare Live Server. Il comando npm start del backend carica .env; node server.js da solo non lo fa.

## Errori frequenti
- SQLite incompatible architecture: eseguire npm ci dentro backend e controllare che non si riutilizzino dipendenze dello ZIP precedente.
- Chiave JWT non configurata: controllare backend/.env.
- Migrazione modificata: usare tutti i file SQL della stessa versione corretta, senza aggiornare a mano schema_migrations. Conservare il database e segnalare il messaggio.
- Porta occupata: arrestare la precedente propria esecuzione, senza terminare processi non identificati.
- Sito visibile ma dati/login non disponibili: controllare il terminale backend.
- Il recupero password via email richiede configurazione SMTP completa; SMTP non e richiesto per l'avvio ordinario.

## Contenuto della consegna
Il repository e questo archivio includono initial.sqlite come snapshot, non il database operativo personale database.sqlite. Sono esclusi node_modules, .env, backup e cache. Nessun hosting o wrapper nativo e richiesto. I dati operativi e i backup conservati sul computer originale non vengono cancellati. Lo snapshot e le foto correlate sono preservati nella correzione; non pubblicare ulteriori dati operativi per aggirare la distinzione fra ZIP e branch.

## Database dimostrativo con utenti, prenotazioni e segnalazioni

Il file `backend/db/demo.sqlite` contiene 10 utenti fittizi, 24 prenotazioni (18 concluse e 6 future alla generazione), 7 segnalazioni, 18 edifici e 3 spazi. Non contiene un amministratore del mittente. Le password degli utenti demo sono casuali e non disponibili: servono come dati dimostrativi. Crea il tuo amministratore oppure registra un nuovo utente per accedere.

Dal terminale dentro backend, dopo npm ci e la preparazione di .env:

1. Copia lo snapshot in un file locale nuovo, senza sovrascrivere dati esistenti:

```bash
node -e "require('node:fs').copyFileSync('db/demo.sqlite','db/demo-locale.sqlite',require('node:fs').constants.COPYFILE_EXCL)"
```

2. Imposta in `.env` il database da usare per l'avvio:

```env
SLOTLAB_DB_PATH=./db/demo-locale.sqlite
```

3. Compila le quattro variabili SLOTLAB_ADMIN_... di `.env` con i tuoi dati e una password valida (8–64 caratteri, maiuscola, minuscola, numero, simbolo, senza spazi). Poi esegui:

```bash
npm run db:seed
SLOTLAB_DB_PATH=./db/database.sqlite SLOTLAB_DEMO_DB_PATH=./db/demo-locale.sqlite npm run db:seed-demo
npm start
```

Il secondo comando rigenera le date demo rispetto al giorno corrente e ripristina le fasce demo dopo il seed iniziale. La variabile SLOTLAB_DB_PATH impostata soltanto in quel comando indica al controllo quale database operativo proteggere; seed-demo scrive esclusivamente nel percorso SLOTLAB_DEMO_DB_PATH. All'avvio successivo npm start usa normalmente demo-locale.sqlite indicato in .env.

Se demo-locale.sqlite esiste già, il comando di copia rifiuta di sovrascriverlo: conservarlo e verificare i suoi dati prima di procedere. La rigenerazione del seed sostituisce le prenotazioni e le segnalazioni dimostrative riconoscibili; non usarla come recupero di dati personali. Le prenotazioni future dello snapshot possono diventare passate: rigenerare il campione quando serve una dimostrazione aggiornata.

La copia locale del mittente conserva nel proprio demo-locale.sqlite anche l'amministratore precedente. Quel file, .env e database.sqlite non sono pubblicati. Per tornare al database operativo precedente basta reimpostare SLOTLAB_DB_PATH=./db/database.sqlite e riavviare il backend; il file originale non è stato sostituito.
