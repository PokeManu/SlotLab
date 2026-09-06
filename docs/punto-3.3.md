# Punto 3.3 — Registrazione HTTP

Implementato il 6 settembre 2026 sul branch `Backend`, preservando le modifiche locali del punto 3.2.

## Comportamento

`POST /api/v1/auth/register` e pubblico. Riceve nome, cognome, email e password, valida i dati con il modulo condiviso e crea immediatamente un account con ruolo `user`. Nome/cognome sono privati degli spazi esterni; email anche convertita in minuscolo; password mai corretta silenziosamente.

Il campo `role` viene rifiutato se presente, anche se vale `user` o `null`. Il ruolo viene scritto come valore fisso nella query SQL. Non viene generata una sessione, non vengono emessi token o cookie. Dopo la registrazione occorre effettuare il login, che sara implementato nel punto 3.4; il collegamento e la navigazione dei form frontend appartengono al 3.8.

Risposta `201`: `{ data: { id, firstName, lastName, email, role, createdAt } }`. La risposta e costruita con un elenco esplicito di campi pubblici; non include password o hash.

Errori:

- `400 VALIDATION_ERROR`: corpo mancante/non oggetto, campi obbligatori mancanti o di tipo errato, nome/cognome vuoti, campo `role` presente.
- `400 INVALID_EMAIL`: email stringa con formato non valido.
- `400 INVALID_PASSWORD_FORMAT`: password stringa che non rispetta le regole.
- `409 EMAIL_ALREADY_EXISTS`: email normalizzata gia presente.
- JSON malformato e altri errori tecnici continuano a passare dal middleware comune. Gli errori inattesi del database diventano `500 INTERNAL_ERROR`, senza dettagli tecnici nel client o nei log.

## File e ragionamento

- `backend/routes/auth.routes.js`: gestisce validazione, hash, inserimento e risposta. La query e parametrizzata e usa `ON CONFLICT(email) DO NOTHING`: il vincolo UNIQUE esistente decide atomicamente anche per richieste concorrenti. Zero righe inserite significa email duplicata. Altri errori SQLite vengono propagati, senza convertirli tutti in duplicati. L'inserimento e una sola istruzione, quindi non richiede una transazione manuale composta.
- `backend/routes/api.routes.js`: monta il router sotto `/auth`.
- `backend/security/validation.js`: aggiunge agli errori i codici del contratto, mantenendo controlli e messaggi del 3.2. Lo stato HTTP 400 viene assegnato nella rotta, soltanto agli errori di validazione riconosciuti.
- `backend/test/register.test.js`: nove test HTTP con database, segreto e porta temporanei.
- `backend/README.md`: documenta endpoint e comandi aggiornati.

Nessuna modifica a schema, migrazioni o dipendenze. Gli amministratori continuano a essere creati tramite seed tecnico.

## Verifica

Node 24.19.0, comando dalla cartella backend: `node --test test/*.test.js`, equivalente a `npm test`. Esecuzione autorizzata fuori dal sandbox per le porte loopback: **35/35 test superati**.

I nove nuovi test coprono dati normalizzati e hash verificabile, assenza di sessioni/cookie, campi mancanti o errati, regole email/password, ruolo rifiutato, duplicati normalizzati senza alterazione dell'account originale, due richieste simultanee (un 201 e un 409, una sola riga), testo SQL trattato come dati, JSON malformato/corpo assente ed errore database simulato senza divulgazione di dettagli.

Database operativo assente al controllo finale; nessun `.env` operativo caricato. Server e database dei test vengono chiusi e rimossi. Frontend, build e browser non rieseguiti: questo passo implementa soltanto l'endpoint HTTP. Le protezioni operative contro richieste abusive restano da completare nei passi di sicurezza previsti; non si dichiara il flusso completo pronto per la produzione.

Prossimo sottopasso: **3.4 — Login e creazione sessione**, da autorizzare separatamente.
