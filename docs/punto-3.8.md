# Punto 3.8 — Collegamento dell’autenticazione al frontend

Implementato il 7 settembre 2026 sul branch `Backend`, partendo da HEAD `a08e4b7` e working tree pulita. Nessuna operazione Git di scrittura e nessuna modifica al backend, alle dipendenze o al database operativo.

## Codice, pezzo per pezzo

1. **Form (`src/app/auth/access.page.ts`, `.html`, `.scss`).** Un componente serve le route `/login` e `/register`, con campi ed etichette differenti. Controlla campi obbligatori, email e requisiti password della registrazione; normalizza email e nomi senza correggere la password. Il backend resta responsabile della validazione definitiva. Durante l’invio disabilita il form e impedisce richieste duplicate. Distingue errori di credenziali, email già usata, validazione e rete. Dopo registrazione torna al login con conferma, senza accesso automatico; dopo login apre Home o dashboard secondo il ruolo restituito dal server.

2. **Stato reale (`src/app/auth/auth.ts`).** Sostituisce il ruolo admin simulato con un profilo reattivo e un access token conservato soltanto in memoria. `register()` e `login()` chiamano le API esistenti. `recoverSession()` condivide un singolo rinnovo seguito da `GET /users/me`, aggiornando insieme token e identità. Il refresh token rimane nel cookie HttpOnly: il codice Angular non lo legge né lo salva in storage.

3. **Avvio (`src/main.ts`).** L’inizializzatore attende `restore()` prima della navigazione iniziale. Un cookie assente porta normalmente al login; un errore di connessione mostra un messaggio, senza impedire la visualizzazione dei form. Il ripristino avviene tramite refresh e lettura del profilo, non tramite un ruolo recuperato da localStorage.

4. **Richieste (`auth-interceptor.ts`, `http-context.ts`).** Il Bearer viene aggiunto soltanto alle API relative del progetto, escludendo gli endpoint di autenticazione e i servizi esterni. Un 401 può avviare un rinnovo condiviso e una sola ripetizione della richiesta. Un secondo 401 invalida lo stato e riporta al login; 403 ed errori di rete non causano rinnovi automatici. La lettura del profilo usa esplicitamente il nuovo token ed evita ricorsioni nell’interceptor. La versione della sessione impedisce a richieste precedenti a logout o nuovo login di usare il nuovo account; un token rinnovato nella stessa sessione può invece essere riutilizzato.

5. **Identità e logout.** Profilo, topbar, saluti Home/Spazi e intestazioni admin mostrano nome, email o iniziali reali dove previsti. I pulsanti Esci chiamano il logout già implementato nel 3.7. Durante l’uscita vengono bloccati nuovi rinnovi; il successo cancella token/profilo e naviga al login. Un errore conserva lo stato e mostra un messaggio per riprovare. Risposte del profilo arrivate dopo il logout non ricreano la sessione. I dati applicativi delle pagine restano quelli precedenti, spesso simulati: saranno collegati nel punto 4.

6. **Accesso alle pagine (`session-guard.ts`, `app.routes.ts`, `admin-guard.ts`).** Una guard minima richiede la sessione nelle pagine esistenti; login e registrazione rimandano gli utenti già autenticati alla destinazione del loro ruolo. La guard admin legge il ruolo reale. La pulizia completa delle route duplicate, la protezione di ruolo mancante su `admin/bookings`, la separazione completa delle navigazioni e le destinazioni di ritorno restano nel 3.9. Le guard del browser non sostituiscono mai i controlli server del 3.5.

## Verifiche e limiti

- **27/27 test Angular mirati**, in sette file: autenticazione/interceptor, form, coordinamento refresh/logout, guard, profilo e topbar. Richieste simulate con `HttpTestingController`; nessun account reale. Coprono rinnovi simultanei, 401 tardivi, limite al retry, ruoli, rete, logout e risposte di una sessione precedente.
- Build di sviluppo completa riuscita fuori dal sandbox, con Node 24.19.0; nel sandbox il processo terminava con codice 134. Compilazione del server Angular e dei test riuscita. Warning Browserslist preesistente. Dopo l’ultima protezione sulle risposte tardive è stata ricompilata e verificata la suite mirata.
- Browser: login desktop 1280×720, login e registrazione mobile 390×844; controllati leggibilità, navigazione tra i form, campi vuoti e password non valida. Corretto un ID accessibile duplicato tra pagine conservate da Ionic. Prove visive effettuate via HTTP con backend spento: è stato osservato anche il messaggio di server non disponibile.
- **Ciclo login/refresh/logout nel browser HTTPS non verificato:** il certificato locale è rifiutato con `ERR_CERT_AUTHORITY_INVALID`. Non sono stati aggirati avvisi TLS né indeboliti gli attributi cookie. Serve un certificato attendibile per completare questa verifica d’integrazione.
- Suite backend non rieseguita: nessun cambiamento backend; ultimo risultato documentato 66/66. Suite frontend completa e build di produzione non rieseguite; non si dichiarano risolte le anomalie pregresse dei test e dei budget CSS admin.
- DB operativo `backend/db/database.sqlite` ancora assente; nessun `.env` operativo creato o caricato. Server di prova arrestati.

Il coordinamento vale nell’istanza Angular corrente; la verifica tra più schede e l’intero ciclo HTTPS restano nell’integrazione 3.12. Cambio/recupero password e cancellazione account rimangono rispettivamente 3.10 e 3.11. Prossimo intervento: **3.9 — Protezione e pulizia route frontend**.
