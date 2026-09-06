# Backend SlotLab

Il backend usa Express, JavaScript CommonJS e SQLite. La struttura rimane volutamente essenziale, così ogni flusso può essere aggiunto e verificato separatamente.

## Struttura

- `app.js`: configura Express, il formato JSON, le rotte e i middleware finali.
- `server.js`: inizializza il database, avvia il server HTTP e gestisce la chiusura.
- `routes/root.routes.js`: conserva la rotta tecnica `GET /`.
- `routes/api.routes.js`: punto di ingresso delle future API sotto `/api/v1`.
- `middleware/not-found.js`: trasforma una rotta inesistente in un errore controllato.
- `middleware/error-handler.js`: restituisce gli errori nel formato JSON del contratto API.
- `db/`: schema, migrazioni, connessione condivisa e dati iniziali.
- `security/`: operazioni di sicurezza riutilizzabili, attualmente l'hash delle password.
- `config.js`: valida ambiente, porta e segreto e raccoglie le scadenze e le opzioni dei futuri token/cookie.
- `.env.example`: esempio senza segreti da copiare in `.env` per la configurazione locale.

Non vengono create cartelle vuote per controller, servizi o repository. Saranno introdotte quando il relativo flusso verrà implementato, evitando file segnaposto privi di comportamento.

## Ripristinare il componente SQLite

Se, dopo aver copiato il progetto o cambiato ambiente Node, compare `Could not locate the bindings file`, dalla cartella `backend` eseguire:

```bash
npm rebuild sqlite3
```

Il comando richiede accesso alla rete per scaricare il componente nativo compatibile; se non disponibile, tenta la compilazione locale. `package.json` autorizza lo script di installazione di `sqlite3@6.0.1` nelle versioni npm che richiedono `allowScripts`. Dopo un aggiornamento di questa dipendenza occorre riesaminare anche tale autorizzazione.

## Avvio

Serve Node.js almeno 22.9 per i comandi con `--env-file-if-exists`; verificato in questo ambiente con Node 26.7. I comandi npm vengono eseguiti dalla cartella `backend` e caricano il suo `.env`, se presente. Le variabili gia impostate nel terminale hanno precedenza. Non occorre installare `dotenv`.

### Configurazione iniziale

1. Copiare `.env.example` in `.env`:

```bash
cp .env.example .env
```

2. Generare il segreto sul proprio computer:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

3. Incollare il risultato dopo `SLOTLAB_JWT_SECRET=` dentro `.env`. Non condividerlo in chat e non caricare `.env` su Git. L'esempio versionato non contiene un valore utilizzabile. Lo stesso segreto deve rimanere stabile fra i riavvii dello stesso ambiente; quello di produzione deve essere distinto da quello di sviluppo.

Il server valida la configurazione prima di aprire SQLite: un segreto mancante o non composto da 64 caratteri esadecimali interrompe l'avvio, senza creare il database. Questa fase prepara il segreto ma non genera ancora token ne implementa il login.

| Impostazione | Significato |
|---|---|
| `NODE_ENV` | `development`, `test` o `production` |
| `HOST` | Indirizzo di ascolto, predefinito `127.0.0.1` |
| `PORT` | Porta, predefinita 3000; zero ammesso soltanto nei test |
| `SLOTLAB_JWT_SECRET` | Segreto locale per i futuri access token |
| `SLOTLAB_DB_PATH` | Percorso alternativo del database; usare un percorso assoluto per le prove manuali |

Le durate concordate sono costanti in `config.js`: access token 1800 secondi e refresh token 604800 secondi. Le opzioni del cookie sono `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/api/v1/auth`; `maxAge` e espresso in millisecondi. Non sono modificabili tramite variabili d'ambiente per evitare divergenze accidentali dal contratto.

### Server

```bash
npm start
```

Il server esegue prima le migrazioni e si mette in ascolto soltanto se SQLite è pronto. La rotta `GET /` risponde con `Server attivo`.

`npm run dev` avvia lo stesso server con riavvio automatico tramite nodemon. Dopo aver cambiato `.env`, riavviare il processo. `npm run db:migrate` e `npm run db:seed` leggono anch'essi `.env`; non richiedono il segreto JWT per eseguire le sole operazioni sul database.

**Attenzione:** un avvio manuale senza `SLOTLAB_DB_PATH` usa o crea `backend/db/database.sqlite`. La suite di test non usa questo file e non carica `.env`.

Le future rotte applicative saranno montate sotto `/api/v1`. Finché non vengono implementate, una richiesta a tale prefisso restituisce `404` nel formato:

```json
{
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "La risorsa richiesta non esiste."
  }
}
```

Un corpo dichiarato come JSON ma sintatticamente errato restituisce `400 INVALID_JSON`. Gli errori interni non espongono dettagli tecnici al client.

## Collegamento locale con Ionic/Angular

Il frontend usa `environment.apiUrl = '/api/v1'` sia in sviluppo sia in produzione. `angular.json` carica `proxy.conf.json`: le richieste `/api/**`, inclusi i percorsi annidati, sono inoltrate a `http://127.0.0.1:3000` mantenendo il percorso e l'origine della richiesta. Non serve abilitare un CORS aperto.

Con il backend attivo, dalla cartella principale di SlotLab:

```bash
npm run start:https
```

In alternativa, con Ionic CLI:

```bash
ionic serve --ssl
```

Aprire l'indirizzo HTTPS mostrato dal comando. Il certificato locale del server di sviluppo puo richiedere un'autorizzazione nel browser; su iPhone puo servire un certificato di sviluppo riconosciuto dal dispositivo. Per le prove LAN, esporre il solo server frontend sulla rete fidata con `ionic serve --ssl --external`; il proxy puo continuare a raggiungere Express sul loopback del Mac.

`npm start` e `ionic serve` senza SSL rimangono utilizzabili per l'interfaccia, ma le prove del futuro cookie `Secure` vanno effettuate in HTTPS. Non disattiviamo `Secure` per far funzionare l'autenticazione su HTTP. In produzione il server HTTPS dovra inoltrare `/api` a Express: il proxy Angular esiste soltanto durante lo sviluppo. Se si cambia la porta del backend, aggiornare anche il target in `proxy.conf.json` e riavviare il frontend.

Per verificare il collegamento, aprire `/api/v1/missing` sull'origine HTTPS del frontend: deve arrivare il JSON `404 ROUTE_NOT_FOUND` di Express, non una pagina HTML di Angular. Non esistono ancora endpoint di registrazione o login; il cookie reale verra emesso e verificato nei passaggi successivi.

Riferimenti tecnici: [variabili d'ambiente native di Node](https://nodejs.org/api/cli.html#--env-file-if-existsfile), [proxy del server Angular](https://angular.dev/tools/cli/serve#proxying-to-a-backend-server).

## Verifica della base backend

Dalla cartella `backend`:

```bash
npm test
```

La suite comprende 17 test e crea database e server temporanei. Verifica migrazioni ripetibili, 16 tabelle applicative, chiavi esterne, connessione condivisa, dati iniziali idempotenti e risposte HTTP di base. Verifica inoltre gli snapshot in inserimento e aggiornamento, il passaggio dalla migrazione 1 alla 2 senza perdita di dati o riutilizzo degli ID e il rollback in presenza di dati storici incompleti. I test del punto 3.1 verificano configurazione, scadenze, opzioni dei cookie, errori uniformi e arresto prima della creazione del database in caso di configurazione errata. Al termine elimina i dati temporanei e non modifica `db/database.sqlite`.

I test generano un segreto effimero in memoria; non usano quello del file `.env`. Nessuna nuova dipendenza e stata necessaria nel punto 3.1: le librerie per firmare/verificare JWT e leggere i cookie saranno valutate quando saranno effettivamente usate, senza realizzare JWT manualmente.
