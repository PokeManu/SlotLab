# Punto 3.4 — Login e creazione della sessione

Implementato il 6 settembre 2026 sul branch `Backend`, preservando le modifiche locali dei punti 3.2 e 3.3. Nessun commit o push in questo passo.

## Comportamento

`POST /api/v1/auth/login` riceve `email` e `password`. L'email viene normalizzata; la password e verificata con scrypt senza trim. Account inesistente, password errata e credenziali mancanti/non valide ricevono lo stesso `401 INVALID_CREDENTIALS`, con messaggio generico. Il parser JSON conserva i propri errori: JSON malformato o valore JSON scalare/null restituiscono `400 INVALID_JSON`.

User e admin possono accedere. Il ruolo e letto dal database: un eventuale valore nel corpo non lo modifica. Un hash fittizio permette di eseguire scrypt anche per email inesistenti con password di lunghezza valida, riducendo la differenza evidente tra i due percorsi; non rappresenta un account utilizzabile e non promette tempi identici in tutti i casi.

Il successo restituisce `200` nel formato del contratto: accessToken, tokenType Bearer, expiresIn 1800 e user con id/nome/cognome/email/ruolo. La risposta usa `Cache-Control: no-store`. Il refresh non compare nel JSON.

## Codice, pezzo per pezzo

1. `backend/routes/auth.routes.js` legge l'account con query parametrizzata e verifica la password. Un errore inatteso continua a passare dal middleware 500, senza stampare la richiesta o i dettagli interni.
2. `backend/security/tokens.js` genera un jti tramite UUID casuale e firma il JWT con `jsonwebtoken`, algoritmo HS256 esplicito. La chiave sono i 32 byte decodificati dal segreto hex configurato. I soli claim sono sub, role, iat, exp, jti; sub e una stringa e exp dista 1800 secondi da iat.
3. La stessa funzione genera 32 byte casuali in base64url come refresh e calcola SHA-256. SHA-256 riguarda questo token casuale ad alta entropia; le password continuano a usare scrypt.
4. La rotta salva hash refresh, jti e date tramite un unico INSERT ... SELECT ... ON CONFLICT(user_id) DO UPDATE. Aggiorna anche created_at e refresh_expires_at. La riga tecnica puo mantenere il proprio id; la coppia di token viene sostituita interamente. Non esiste un intervallo tra cancellazione e reinserimento, e il vincolo UNIQUE mantiene una sola riga anche con login concorrenti.
5. La SELECT dell'inserimento ricontrolla id, hash password e ruolo dell'account letto prima di scrypt. Se nel frattempo l'account cambia o sparisce, zero righe modificate impediscono di restituire token.
6. Solo dopo il salvataggio riuscito, Express imposta `slotlab_refresh` con HttpOnly, Secure, SameSite=Lax, Path `/api/v1/auth`, durata 7 giorni. Nome aggiunto in `backend/config.js`; gli altri parametri erano gia predisposti. Nessun parsing cookie necessario in questo passo.

## Dipendenze e file

Oltre a router/configurazione e al nuovo `security/tokens.js`:

- `backend/package.json` e `backend/package-lock.json`: aggiunto `jsonwebtoken` 9.0.3, versione esatta, con le sue dipendenze. Installazione mirata con script disabilitati; nessun aggiornamento degli altri pacchetti gia bloccati.
- `.gitignore`: aggiunta esclusione di `/backend/node_modules/` per evitare l'aggiunta dei nuovi pacchetti a Git. I file storicamente tracciati restano tracciati; nessuna pulizia massiva.
- `backend/node_modules/.package-lock.json`: npm ha aggiornato questo metadato gia tracciato; modifica lasciata presente, senza ripristini.
- `backend/test/login.test.js`: nove test HTTP dedicati; `backend/test/config.test.js` verifica anche il nome cookie.
- `backend/README.md`: descrizione e comandi aggiornati.

Riferimenti usati: [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken), [API Express](https://expressjs.com/en/5x/api/).

## Verifiche e limiti

Node 24.19.0, dalla cartella backend: `node --test test/*.test.js`, equivalente a `npm test`. **44/44 test superati**, con esecuzione autorizzata per le porte loopback.

Verificati firma JWT, claim, durata e scadenza tramite la libreria; ruolo user/admin dal DB; errore credenziali uniforme; attributi del cookie; durata refresh e hash nel DB; sostituzione sessione sequenziale e concorrente; errore di scrittura senza emissione token e con sessione precedente conservata; password cambiata tra lettura e salvataggio. La prima esecuzione aveva un'aspettativa errata nel test per JSON null: corretto il test per rispettare il parser Express esistente, senza modificare il comportamento applicativo.

Le prove HTTP leggono le intestazioni del cookie su loopback: non verificano memorizzazione e reinvio da un browser HTTPS. Secure non e stato disabilitato. Nessuna modifica frontend, build/browser non rieseguiti. DB operativo assente al controllo; test con DB temporanei e segreto effimero, senza `.env` operativo. Nessun account reale creato, nessuna migrazione modificata.

Il login sostituisce i dati della sessione sul server. La revoca del vecchio access token sulle richieste protette richiede il controllo del jti del **3.5**, ancora da implementare: la sola firma JWT non revoca un token. Refresh/rotazione, logout, collegamento frontend e protezioni operative contro richieste abusive restano nei rispettivi sottopassi. Non e una verifica completa dell'autenticazione nel browser.

Prossimo passo: **3.5 — Protezione API, ruoli e GET /users/me**, da autorizzare separatamente.
