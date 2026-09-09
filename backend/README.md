# Backend SlotLab

Il backend usa Express, JavaScript CommonJS e SQLite. La struttura rimane volutamente essenziale, così ogni flusso può essere aggiunto e verificato separatamente.

## Struttura

- `app.js`: configura Express, il formato JSON, le rotte e i middleware finali.
- `server.js`: inizializza il database, avvia il server HTTP e gestisce la chiusura.
- `routes/root.routes.js`: conserva la rotta tecnica `GET /`.
- `routes/api.routes.js`: punto di ingresso delle API sotto `/api/v1`.
- `routes/auth.routes.js`: registrazione e login pubblici tramite `POST /api/v1/auth/register` e `POST /api/v1/auth/login`.
- `middleware/not-found.js`: trasforma una rotta inesistente in un errore controllato.
- `middleware/error-handler.js`: restituisce gli errori nel formato JSON del contratto API.
- `db/`: schema, migrazioni, connessione condivisa e dati iniziali.
- `security/`: validazione condivisa, hash/verifica password e generazione dei token di sessione.
- `config.js`: valida ambiente, porta e segreto e raccoglie scadenze, nome e opzioni del cookie refresh.
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

Il server valida la configurazione prima di aprire SQLite: un segreto mancante o non composto da 64 caratteri esadecimali interrompe l'avvio, senza creare il database. Il login usa i 32 byte rappresentati dal segreto per firmare gli access token con HS256 tramite `jsonwebtoken`.

| Impostazione | Significato |
|---|---|
| `NODE_ENV` | `development`, `test` o `production` |
| `HOST` | Indirizzo di ascolto, predefinito `127.0.0.1` |
| `PORT` | Porta, predefinita 3000; zero ammesso soltanto nei test |
| `SLOTLAB_JWT_SECRET` | Segreto locale per firmare gli access token |
| `SLOTLAB_DB_PATH` | Percorso alternativo del database; usare un percorso assoluto per le prove manuali |

Le durate concordate sono costanti in `config.js`: access token 1800 secondi e refresh token 604800 secondi. Le opzioni del cookie sono `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/api/v1/auth`; `maxAge` e espresso in millisecondi. Non sono modificabili tramite variabili d'ambiente per evitare divergenze accidentali dal contratto.

Il cookie si chiama `slotlab_refresh` ed e emesso dal login. Il refresh e casuale (32 byte in base64url); il server ne salva solo l'hash SHA-256. Un nuovo login sostituisce hash, jti e date della sessione dell'account. Il punto 3.5 controlla il jti su GET /api/v1/users/me: il vecchio access token viene rifiutato dopo un nuovo login. Il punto 3.6 implementa il rinnovo e la rotazione atomica tramite POST /api/v1/auth/refresh.

### Server

```bash
npm start
```

Il server esegue prima le migrazioni e si mette in ascolto soltanto se SQLite è pronto. La rotta `GET /` risponde con `Server attivo`.

`npm run dev` avvia lo stesso server con riavvio automatico tramite nodemon. Dopo aver cambiato `.env`, riavviare il processo. `npm run db:migrate` e `npm run db:seed` leggono anch'essi `.env`; non richiedono il segreto JWT per eseguire le sole operazioni sul database.

Per popolare esclusivamente un database separato di prova con tre fasce giornaliere per ogni spazio e prenotazioni fittizie, usare `npm run db:seed-demo` dopo il seed principale. Il comando richiede `SLOTLAB_DB_PATH`, rifiuta il percorso `backend/db/database.sqlite`, conserva i dati non demo e può essere rieseguito senza duplicare le proprie prenotazioni.

**Attenzione:** un avvio manuale senza `SLOTLAB_DB_PATH` usa o crea `backend/db/database.sqlite`. La suite di test non usa questo file e non carica `.env`.

Le rotte applicative sono montate sotto `/api/v1`. E disponibile `POST /api/v1/auth/register`: riceve `firstName`, `lastName`, `email`, `password`, crea un account `user` e restituisce `201` con i dati pubblici. Non accetta il campo `role`, non crea sessioni e non effettua il login automatico. Un percorso non implementato restituisce `404` nel formato:

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

`npm start` e `ionic serve` senza SSL rimangono utilizzabili per l'interfaccia, ma le prove del cookie `Secure` vanno effettuate in HTTPS. Non disattiviamo `Secure` per far funzionare l'autenticazione su HTTP. In produzione il server HTTPS dovra inoltrare `/api` a Express: il proxy Angular esiste soltanto durante lo sviluppo. Se si cambia la porta del backend, aggiornare anche il target in `proxy.conf.json` e riavviare il frontend.

Per verificare il collegamento, aprire `/api/v1/missing` sull'origine HTTPS del frontend: deve arrivare il JSON `404 ROUTE_NOT_FOUND` di Express, non una pagina HTML di Angular. Registrazione e login HTTP sono implementati, ma i form frontend non sono ancora collegati. Il login riceve email/password e restituisce access token e dati pubblici dell'utente nel JSON, refresh soltanto nel cookie. Credenziali errate restituiscono `401 INVALID_CREDENTIALS`.

Riferimenti tecnici: [variabili d'ambiente native di Node](https://nodejs.org/api/cli.html#--env-file-if-existsfile), [proxy del server Angular](https://angular.dev/tools/cli/serve#proxying-to-a-backend-server).

## Verifica della base backend

Dalla cartella `backend`:

```bash
npm test
```

La suite comprende 66 test e crea database e server temporanei. Verifica migrazioni ripetibili, 16 tabelle applicative, chiavi esterne, connessione condivisa, dati iniziali idempotenti e risposte HTTP di base. Verifica inoltre gli snapshot in inserimento e aggiornamento, il passaggio dalla migrazione 1 alla 2 senza perdita di dati o riutilizzo degli ID e il rollback in presenza di dati storici incompleti. I test del punto 3.1 verificano configurazione, scadenze, opzioni dei cookie, errori uniformi e arresto prima della creazione del database in caso di configurazione errata. Il punto 3.2 aggiunge validazione dei dati, verifica password, compatibilita con gli hash precedenti e rifiuto degli hash malformati prima del calcolo scrypt. Il punto 3.3 verifica la registrazione HTTP, inclusi duplicati concorrenti e rifiuto del ruolo inviato dal client. Il punto 3.4 verifica login, JWT, cookie e sessione unica. Al termine elimina i dati temporanei e non modifica `db/database.sqlite`.

Per i soli controlli del modulo password e della validazione: `node --test test/password.test.js`. Il resoconto del punto 3.2 e in `../docs/punto-3.2.md`.

Per la registrazione HTTP: `node --test test/register.test.js`, con porta locale e database temporanei. Dettagli in `../docs/punto-3.3.md`.

Per il login HTTP: `node --test test/login.test.js`. Dettagli, limiti della verifica e dipendenze in `../docs/punto-3.4.md`.

I test generano un segreto effimero in memoria; non usano quello del file `.env`. Il punto 3.4 introduce `jsonwebtoken` 9.0.3. Per installare le dipendenze dalla cartella backend usare `npm install`; un eventuale ripristino mirato del binding SQLite e descritto sopra. Il punto 3.6 aggiunge cookie-parser 1.4.7 per il rinnovo.

## API protette — Punto 3.5

`GET /api/v1/users/me` richiede Authorization Bearer e restituisce id, firstName, lastName, email, role e createdAt. Accetta user/admin. `middleware/auth.js` verifica firma HS256, scadenza, claim e corrispondenza con account/sessione nel database; esporta anche `requireRole(...roles)`. Autenticazione non valida: 401 UNAUTHORIZED; ruolo non consentito: 403 FORBIDDEN. Registrazione e login restano pubblici.

Test mirati: `node --test test/auth.test.js`. Resoconto: `../docs/punto-3.5.md`. Le future API riservate dovranno usare gli stessi middleware; le route Angular non sono ancora protette realmente.

## Refresh — Punto 3.6

`POST /api/v1/auth/refresh` richiede il cookie `slotlab_refresh` e l’header `X-SlotLab-Request: 1`. Ruota hash refresh e jti con un UPDATE condizionato; emette un nuovo cookie di 7 giorni e un access token di 30 minuti. Conserva la data del login. Gli errori non cancellano il cookie per non danneggiare richieste concorrenti. Non abilitare CORS verso origini arbitrarie.

Test mirati: `node --test test/refresh.test.js`. Angular dispone di `RefreshSession` per condividere la richiesta in corso, ancora da collegare ai flussi del 3.8. Resoconto completo: `../docs/punto-3.6.md`.

## Logout — Punto 3.7

`POST /api/v1/auth/logout` richiede il cookie di sessione e X-SlotLab-Request: 1. Elimina soltanto la sessione con lo stesso hash, fa scadere il cookie dopo la cancellazione e restituisce 204 senza corpo. Cookie assente/non corrente: 204 senza alterare nuove sessioni o cookie. Non serve un Bearer valido. Gli errori DB restano 500.

Test: `node --test test/logout.test.js`. Il servizio Angular RefreshSession coordina logout e refresh; pulizia dello stato reale e navigazione restano da collegare nel 3.8. Resoconto: `../docs/punto-3.7.md`.
