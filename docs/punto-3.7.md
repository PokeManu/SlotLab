# Punto 3.7 — Logout backend e coordinamento Angular

Implementati il 6 settembre 2026 sul branch `Backend`, preservando le modifiche locali precedenti. Nessun commit o push.

## Codice, pezzo per pezzo

1. `backend/routes/auth.routes.js`: `POST /api/v1/auth/logout` riusa parser cookie e protezione delle richieste basate su cookie (header X-SlotLab-Request: 1, rifiuto cross-site, no-store).
2. Il cookie valido viene trasformato in hash e usato in un unico DELETE parametrizzato su auth_sessions. Non si cancella per user_id ricevuto dal client. Non occorre un Bearer valido: si puo uscire anche dopo la scadenza dell'access token.
3. Una sessione eliminata rende inutilizzabili sia access token, tramite il controllo jti del 3.5, sia refresh. Se il cookie non corrisponde piu a una sessione, il DELETE non colpisce un nuovo login/rinnovo dello stesso account.
4. Dopo una cancellazione effettiva `clearCookie` mantiene nome, Path, HttpOnly, Secure e SameSite, senza il maxAge di 7 giorni. Cookie assente/malformato/non corrente: 204 senza cookie di risposta e senza modificare altre sessioni. Questo evita che una vecchia richiesta cancelli il cookie di una sessione piu recente. Errore DB: 500 e cookie conservato, senza dichiarare logout riuscito.
5. `src/app/auth/refresh-session.ts` aggiunge `logout()`: condivide la richiesta, aspetta il refresh gia in corso e poi invia il cookie corrente; procede anche se quel refresh fallisce. Durante il logout impedisce nuovi refresh. Un errore logout e propagato, senza retry automatico; e possibile un nuovo tentativo esplicito. Non legge il refresh in JavaScript.

## Verifiche

- `backend/test/logout.test.js`: sei test HTTP su DB temporaneo: 204 vuoto/cookie scaduto/token revocati, vecchio logout contro nuovo login, logout contro refresh gia ruotato, richieste simultanee, protezione header/cross-site ed errore DB senza perdita della sessione.
- Suite backend `node --test test/*.test.js`: **66/66 superati** con Node 24.19.0 e porte loopback autorizzate.
- `src/app/auth/refresh-session.spec.ts`: quattro test nuovi; file completo **8/8 superati** con `ng test --watch=false --include=src/app/auth/refresh-session.spec.ts`. Verificati condivisione, attesa refresh, blocco nuovi rinnovi, errore refresh e logout senza retry.
- Compilazione mirata Angular riuscita dopo aver esplicitato il tipo dell'Observable usata per attendere il refresh. Warning Browserslist storico ancora presente. Suite frontend completa/build produzione non rieseguite.
- Nessuna nuova dipendenza o migrazione. DB operativo assente. Nessun `.env` operativo caricato. Intestazioni cookie verificate via HTTP; nessuna prova completa in browser HTTPS e nessun indebolimento di Secure.

## Parti ancora da collegare

Il logout backend e il coordinamento delle richieste Angular sono implementati. Il frontend continua a usare il ruolo simulato: non esistono ancora lo stato utente reale e la schermata login da collegare. Pulizia dell'access token/profilo, pulsante logout e ritorno alla schermata di accesso saranno completati nel **3.8** insieme all'autenticazione frontend; non sono dichiarati gia funzionanti.

Il coordinamento del servizio vale nell'istanza Angular corrente. La sincronizzazione della UI tra schede e le prove browser restano da affrontare nell'integrazione; non viene promessa una transazione tra il database e la consegna delle risposte HTTP al browser.

Aggiornati anche contratto API e README. Prossimo passo: **3.8 — Collegamento al frontend**, da autorizzare separatamente.
