# Punto 3.1 — Preparazione tecnica dell'autenticazione

Verifica del 6 settembre 2026, sul branch `Backend`.

## Risultato

Preparata la configurazione necessaria per aggiungere l'autenticazione a piccoli passi. Non sono stati implementati login, registrazione, emissione di token o sessioni. Non sono stati cambiati schema, migrazioni o dati operativi.

## File e motivazione

| File | Intervento |
|---|---|
| `backend/config.js` (nuovo) | Legge e valida ambiente, porta e segreto; raccoglie durata dei token e opzioni del futuro cookie. |
| `backend/.env.example` (nuovo) | Modello di configurazione senza segreti. |
| `.gitignore` | Esclude i file `.env` reali, mantenendo versionabile l'esempio. |
| `backend/server.js` | Controlla la configurazione prima di aprire il database; ascolta sul loopback locale come impostazione predefinita. |
| `backend/package.json` | Carica `.env` con Node nei comandi operativi, ma non nei test; esegue tutti i file di test. |
| `backend/middleware/error-handler.js` | Uniforma gli errori interni al contratto e impedisce di esporre dettagli riservati nella risposta o nel log dell'errore. |
| `backend/test/backend.test.js` | Imposta esplicitamente l'ambiente di test e un segreto temporaneo. |
| `backend/test/config.test.js` (nuovo) | Verifica configurazione, scadenze, cookie e mancata creazione del database quando la configurazione è errata. |
| `backend/test/error-handler.test.js` (nuovo) | Verifica errori pubblici, errori interni e stati HTTP non validi. |
| `proxy.conf.json` (nuovo) | Inoltra `/api/**` dal frontend al backend locale sulla porta 3000. |
| `angular.json` | Attiva il proxy durante lo sviluppo. |
| `package.json` | Aggiunge `start:https` per avviare il frontend in HTTPS. |
| `src/environments/environment.ts` e `environment.prod.ts` | Definiscono il percorso relativo comune `/api/v1`. |
| `backend/README.md` | Documenta configurazione locale, avvio, HTTPS, proxy e separazione dei test. |
| `docs/api-contract.md` | Esplicita gli errori tecnici già gestiti, senza cambiare le regole applicative. |

Non sono state aggiunte dipendenze: Node gestisce già il caricamento di `.env`. Le librerie per JWT e cookie saranno introdotte quando verranno effettivamente utilizzate.

## Come leggere il codice principale

`readConfig()` prende le impostazioni dall'ambiente, controlla che siano valide e restituisce un oggetto unico. `startServer()` lo richiama prima di SQLite: una configurazione incompleta non deve creare per errore un database.

Le costanti `accessTokenSeconds` e `refreshTokenSeconds` fissano rispettivamente 30 minuti e 7 giorni. `refreshCookie` raccoglie le opzioni concordate: HttpOnly, Secure, SameSite=Lax e percorso `/api/v1/auth`. Per ora sono impostazioni, non un'autenticazione funzionante.

Il frontend userà URL relativi: il browser contatterà la stessa origine della pagina e il server di sviluppo inoltrerà le richieste a Express. Il proxy Angular non configura automaticamente il server di produzione.

## Verifiche

- Backend: **17 test superati su 17**, con database temporanei separati.
- Avvio e compilazione del frontend in modalità sviluppo HTTPS: riusciti.
- Proxy HTTPS: `/api/v1/missing` restituisce il JSON 404 di Express. La prova tecnica ha verificato TLS usando esplicitamente il certificato locale, senza disattivare la verifica TLS.
- Una rotta di prova aggiunta soltanto in memoria ha verificato che le intestazioni HttpOnly, Secure, SameSite e Path attraversino il proxy. Non è stata salvata nel progetto e non costituisce un test completo di login o rinnovo sessione.
- Browser automatico: prova HTTPS bloccata da `ERR_CERT_AUTHORITY_INVALID`; il certificato di sviluppo non è riconosciuto. Non è stata aggirata la protezione e non è stato verificato il comportamento completo del cookie nel browser.
- Frontend: **26 test superati e 6 falliti** per provider `ActivatedRoute` mancante nei test delle cinque pagine admin e delle notifiche.
- Build di produzione: bloccata da **5 fogli di stile admin** oltre il limite configurato di 6 kB: prenotazioni, dashboard, segnalazioni, spazi e statistiche.
- Le stesse 6 anomalie nei test e gli stessi 5 errori di build sono stati riprodotti su una copia temporanea del commit precedente alle modifiche: sono preesistenti. Non sono stati corretti modificando soglie o test estranei al punto 3.1.

## Configurazione locale ancora necessaria

Il file `.env` reale non è stato creato. Prima di avviare normalmente il backend, seguire la sezione «Configurazione iniziale» di `backend/README.md`: copiare l'esempio e generare un segreto locale. Senza di esso il server si arresta intenzionalmente. I test non richiedono questa operazione.

Per le future prove di autenticazione nel browser servirà inoltre un certificato HTTPS di sviluppo riconosciuto dal dispositivo utilizzato.

## Passaggi successivi

1. **3.2:** validazione e verifica delle password.
2. **3.3:** registrazione.
3. **3.4:** login e creazione della sessione.
4. **3.5:** protezione API, ruoli e lettura dell'utente corrente.
5. **3.6:** rinnovo dei token.
6. **3.7:** logout.
7. **3.8:** collegamento dei form frontend alle API reali.
8. **3.9:** protezione delle route frontend e rimozione dei duplicati.
9. **3.10:** cambio e recupero password.
10. **3.11:** eliminazione dell'account e gestione delle dipendenze.
11. **3.12:** verifiche finali integrate, di sicurezza e da browser.

Restano da affrontare separatamente anche i problemi frontend preesistenti descritti sopra.
