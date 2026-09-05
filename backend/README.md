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

Non vengono create cartelle vuote per controller, servizi o repository. Saranno introdotte quando il relativo flusso verrà implementato, evitando file segnaposto privi di comportamento.

## Avvio

Dalla cartella `backend`:

```bash
npm start
```

Il server esegue prima le migrazioni e si mette in ascolto soltanto se SQLite è pronto. La rotta `GET /` risponde con `Server attivo`.

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

## Verifica della base backend

Dalla cartella `backend`:

```bash
npm test
```

I test creano un database e un server temporanei. Verificano migrazioni ripetibili, 16 tabelle applicative, chiavi esterne, connessione condivisa, dati iniziali idempotenti e risposte HTTP di base. Al termine eliminano i dati temporanei e non modificano `db/database.sqlite`.
