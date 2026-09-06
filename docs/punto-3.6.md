# Punto 3.6 — Refresh e rotazione token

Implementato il 6 settembre 2026 sul branch `Backend`, preservando i punti 3.2–3.5 non committati. Nessun commit o push.

## Backend, pezzo per pezzo

1. `backend/routes/auth.routes.js` aggiunge `POST /api/v1/auth/refresh`. Il middleware `cookie-parser` 1.4.7 legge il cookie; il suo valore deve rispettare il formato base64url di 43 caratteri generato dal server. Il refresh non viene accettato dal JSON o dal Bearer.
2. `backend/middleware/cookie-request.js` richiede `X-SlotLab-Request: 1`, rifiuta Sec-Fetch-Site cross-site e imposta no-store. L'header personalizzato impedisce l'invio da semplici form esterni e richiede preflight per JavaScript da altra origine; l'app non abilita CORS aperto. SameSite=Lax e Secure restano invariati. Non e un rate limiter; protezioni contro richieste abusive da completare nel passo dedicato.
3. `hashRefreshToken` in `backend/security/tokens.js` centralizza SHA-256 per login e refresh. La ricerca del suo hash unisce sessione e account, verificando l'esistenza di entrambi e la scadenza prima di procedere.
4. La rotazione usa un unico UPDATE condizionato da id sessione, vecchio hash, vecchio jti, scadenza ancora valida e ruolo corrente. Sostituisce insieme hash, jti e scadenza. Con due richieste concorrenti soltanto una puo aggiornare la riga. Una nuova sessione creata da un login concorrente non viene sovrascritta da un refresh che ha letto quella vecchia.
5. Solo dopo l'UPDATE riuscito vengono emessi nuovo cookie e JSON con accessToken, tokenType Bearer, expiresIn 1800. I vecchi token non sono piu accettati. Ogni nuovo refresh ha 7 giorni di durata; created_at resta il momento del login.

Cookie mancante: 401 REFRESH_TOKEN_MISSING. Formato/hash sconosciuto: 401 REFRESH_TOKEN_INVALID. Scaduto: 401 REFRESH_TOKEN_EXPIRED. Sostituzione tra lettura e UPDATE: 401 SESSION_REPLACED. Non esiste uno storico degli hash: un vecchio cookie non piu presente restituisce INVALID, senza pretendere di sapere se provenisse da una sessione sostituita. Gli errori non emettono ne cancellano cookie, per non danneggiare una rotazione concorrente riuscita. Errori DB restano 500 generici.

## Coordinamento Angular

`src/app/auth/refresh-session.ts` espone `RefreshSession.refresh()`, una Observable che chiama il vero endpoint con cookie/header previsti. `defer` sceglie la richiesta alla sottoscrizione; `shareReplay` condivide la richiesta in corso tra chiamanti; `finalize` libera il riferimento dopo successo o errore. La richiesta gia avviata non viene annullata quando un componente si scollega. Nessun retry automatico e nessuna lettura del cookie da JavaScript. `src/main.ts` registra provideHttpClient.

Il coordinamento vale per una singola istanza dell'app, non sincronizza schede diverse. La concorrenza tra schede viene comunque arbitrata atomicamente dal backend. Il servizio non e ancora richiamato dalle schermate: integrazione nel servizio autenticazione, gestione dell'access token, intercettazione dei 401 e ripristino al ricaricamento appartengono al 3.8. Non e stato modificato il ruolo simulato esistente e non si dichiara la navigazione gia autenticata.

## File e dipendenze ulteriori

- `backend/test/refresh.test.js`: sette test HTTP, con barriera nel mock per rendere deterministica la lettura concorrente della stessa sessione.
- `src/app/auth/refresh-session.spec.ts`: quattro test Angular con HttpTestingController.
- `backend/package.json`, lock e metadato npm gia tracciato: cookie-parser 1.4.7 e relativa dipendenza; installazione mirata senza script o aggiornamenti generali.
- `docs/api-contract.md`, `backend/README.md`: header, errori, durata della rotazione e comandi aggiornati.

Riferimento per il parser: [cookie-parser](https://github.com/expressjs/cookie-parser).

## Verifiche

- Backend: `node --test test/*.test.js`, **60/60 superati**, con DB/segreti temporanei e porte loopback autorizzate.
- Frontend: `ng test --watch=false --include=src/app/auth/refresh-session.spec.ts`, **4/4 superati**; compilazione del test riuscita. Rimane il warning Browserslist storico. Suite frontend completa e build produzione non rieseguite.
- Provati rinnovo senza Bearer, cookie/claim, vecchio access rifiutato da users/me, replay refresh rifiutato, scadenza, dati malformati, header richiesto, preflight senza permessi CORS, concorrenza, nuovo login e fallimento DB senza perdita della coppia corrente.
- Angular: una richiesta condivisa, nuovo rinnovo dopo completamento, errori condivisi senza retry e richiesta mantenuta se un componente si scollega.
- Un primo test backend e rimasto in attesa per un errore di firma nel mock SQLite; processo temporaneo identificato/arrestato, mock corretto, suite rieseguita con successo. Nessuna modifica applicativa per aggirare il test.
- Database operativo assente; nessun `.env` operativo caricato. Nessuna migrazione modificata. Intestazioni cookie verificate via HTTP, non il ciclo completo in browser HTTPS; Secure non disabilitato.

Prossimo passo: **3.7 — Logout**, da autorizzare separatamente.
