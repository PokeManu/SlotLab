# Punto 3.5 — Protezione API, ruoli e profilo corrente

Implementato il 6 settembre 2026 sul branch `Backend`, preservando le modifiche locali 3.2–3.4. Nessun commit o push.

## Codice, pezzo per pezzo

1. `backend/middleware/auth.js`, funzione `requireAuth`: legge esclusivamente `Authorization: Bearer ...`. Token in query o cookie non autorizzano questa API. Imposta `Cache-Control: no-store`.
2. Verifica firma e scadenza con jsonwebtoken e algoritmo consentito HS256, usando il segreto decodificato da hex come nel login. Gli errori JWT diventano 401, mentre gli errori operativi restano 500.
3. Controlla i cinque claim concordati, senza campi aggiuntivi: sub come ID positivo rappresentabile esattamente, role user/admin, iat/exp interi con durata 1800 secondi e iat non futuro, jti stringa non vuota. La firma da sola non sostituisce questi controlli.
4. Una query parametrizzata unisce users e auth_sessions: devono corrispondere ID, ruolo corrente e jti. Account inesistente, sessione eliminata o sostituita non autorizzano. Se il controllo riesce, `request.user` contiene soltanto id, firstName, lastName, email, role, createdAt, letti dal database.
5. `requireRole(...roles)` controlla il ruolo del profilo autenticato. Utente assente: `401 UNAUTHORIZED`; ruolo non ammesso: `403 FORBIDDEN`. Va usato dopo `requireAuth` nelle future rotte riservate.
6. `backend/routes/users.routes.js` espone `GET /me` con entrambi i middleware, consentendo user/admin e restituendo `{ data: request.user }`. `backend/routes/api.routes.js` monta il router su `/users`, quindi l'URL completo e `GET /api/v1/users/me`.

Errori di autenticazione uniformi: `401 UNAUTHORIZED`, senza distinguere al client token scaduto, firma errata e sessione assente/sostituita. Non viene usato SESSION_REPLACED, previsto separatamente nel contratto del refresh. Un errore DB rimane `500 INTERNAL_ERROR`, senza dettagli tecnici esposti. I cookie non vengono modificati da questo endpoint.

## Verifiche

`backend/test/auth.test.js` aggiunge nove test. Le rotte usate per provare la separazione user/admin esistono soltanto in un'app Express temporanea in memoria, non nel router del prodotto.

- Profilo pubblico completo per user e admin, senza hash/token; parametri id/role nella query non cambiano l'identita.
- Bearer assente/malformato e token inviato in query/cookie rifiutati.
- Token scaduti, chiave errata, algoritmo differente e JWT senza firma rifiutati.
- Claim mancanti, aggiuntivi, incoerenti o ruolo differente dal DB rifiutati anche con firma valida.
- Nuovo login: vecchio JWT ancora verificabile crittograficamente, ma subito rifiutato da users/me per jti sostituito; nuovo JWT accettato.
- Eliminazione sessione o account nel DB temporaneo: token non scaduto rifiutato.
- User/admin ammessi solo alle rispettive rotte di prova; 403 distinto da 401.
- Errore DB: risposta/log generici, senza divulgazione di dettagli.

Suite completa backend: **53/53 test superati**, Node 24.19.0, `node --test test/*.test.js`, equivalente a npm test. Esecuzione autorizzata fuori dal sandbox per porte loopback temporanee. Nessun `.env` operativo caricato; DB operativo assente al controllo finale. Nessuna modifica schema, migrazione o dipendenza. Frontend/build/browser non rieseguiti: nessuna modifica dell'interfaccia.

## Confine del passo

Registrazione e login restano pubblici. Users/me e ora protetto sul server; le future API dovranno montare gli stessi middleware. La protezione e verificata all'ingresso della richiesta: le future operazioni di scrittura dovranno mantenere i propri controlli transazionali.

Restano da implementare refresh/rotazione (3.6), logout (3.7), collegamento frontend e protezione delle route Angular. La rimozione della sessione e stata simulata direttamente nel DB temporaneo per il test, non e un endpoint logout gia implementato.

Prossimo passo: **3.6 — Refresh e rotazione token**, da autorizzare separatamente.
