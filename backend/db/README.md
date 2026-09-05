# Database SlotLab

Questa cartella contiene lo schema SQLite, il sistema di migrazione e i dati iniziali del backend.

## File

- `schema.sql`: prima migrazione, con le 16 tabelle applicative.
- `migrate.js`: applica in ordine le migrazioni non ancora registrate.
- `seed.js`: inserisce il catalogo dei servizi e crea l'amministratore tecnico.
- `db.js`: inizializza le migrazioni e mantiene la connessione condivisa usata da Express.
- `integrity-rules.md`: separa vincoli SQLite, controlli Express e transazioni.
- `database.sqlite`: database locale predefinito, creato soltanto quando si esegue la migrazione e ignorato da Git.

Il server non apre più il vecchio database relativo alla cartella di esecuzione e non crea autonomamente una tabella `users` semplificata. Usa sempre il percorso risolto dal sistema di migrazione, che per impostazione predefinita è `backend/db/database.sqlite`.

## Eseguire le migrazioni

Dalla cartella `backend`:

```bash
npm run db:migrate
```

La prima esecuzione:

1. crea `db/database.sqlite` se non esiste;
2. crea la tabella tecnica `schema_migrations`;
3. applica `schema.sql` in una transazione;
4. registra versione, nome, checksum e data UTC.

Le esecuzioni successive non ricreano le tabelle. Verificano che la migrazione registrata non sia stata modificata e mostrano che il database è già aggiornato.

## Usare un database diverso

Per prove o ambienti separati si può indicare un percorso esplicito:

```bash
SLOTLAB_DB_PATH=/percorso/database-test.sqlite npm run db:migrate
```

Il percorso viene risolto prima di aprire SQLite e la sua cartella viene creata se necessario.

## Inserire i dati iniziali

Lo script richiede nome, cognome, email e password dell'amministratore tramite variabili d'ambiente. Dalla cartella `backend`:

```bash
export SLOTLAB_ADMIN_FIRST_NAME="Nome"
export SLOTLAB_ADMIN_LAST_NAME="Cognome"
export SLOTLAB_ADMIN_EMAIL="admin@example.com"
read -s "SLOTLAB_ADMIN_PASSWORD?Password amministratore: "
echo
export SLOTLAB_ADMIN_PASSWORD
npm run db:seed
unset SLOTLAB_ADMIN_PASSWORD
```

I valori nell'esempio sono segnaposto e vanno sostituiti. `read -s` evita di mostrare la password e di inserirla direttamente nella cronologia della shell. La password deve rispettare le regole del contratto API: lo script non crea file di configurazione che la contengano e il database riceve soltanto un hash `scrypt` con sale casuale.

Lo script esegue automaticamente le migrazioni, inserisce i cinque servizi approvati e crea l'account con ruolo `admin`. Può essere eseguito nuovamente senza produrre duplicati e non cambia la password di un amministratore già presente. Se l'email indicata appartiene a un utente normale, l'operazione viene annullata.

Gli edifici e gli spazi dimostrativi del frontend non vengono copiati nel database. I dati del campus saranno inseriti dopo la verifica delle fonti ufficiali UniPa, durante lo sviluppo del relativo flusso.

## Avviare il server

Dalla cartella `backend`:

```bash
npm start
```

Prima di mettersi in ascolto, il server:

1. esegue le migrazioni mancanti;
2. apre una sola connessione SQLite condivisa;
3. attiva le chiavi esterne e un'attesa massima di cinque secondi in caso di database occupato;
4. verifica che le chiavi esterne siano realmente attive;
5. avvia Express soltanto se tutti i passaggi precedenti sono riusciti.

La porta predefinita è `3000` e può essere cambiata con la variabile `PORT`. `SLOTLAB_DB_PATH` continua a permettere l'uso di un database separato. Alla ricezione di `SIGINT` o `SIGTERM`, il server chiude prima Express e poi la connessione SQLite.

## Regole per le modifiche future

- Una migrazione già applicata non deve essere modificata: il checksum blocca cambiamenti silenziosi.
- Una variazione futura dello schema deve avere un nuovo file SQL e una nuova versione nell'elenco `migrations` di `migrate.js`.
- Se una migrazione fallisce, la transazione viene annullata e la versione non viene registrata.
- Un vecchio database incompatibile non viene cancellato o sovrascritto automaticamente.
