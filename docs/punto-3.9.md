# Punto 3.9 — Route e separazione dei ruoli

Implementato il 7 settembre 2026 sul branch `Backend`, HEAD `a08e4b7`, preservando tutte le modifiche locali del 3.8. Nessun commit, push, cambio branch o intervento sul database operativo.

## Codice, pezzo per pezzo

1. **`src/app/app.routes.ts`:** eliminate le cinque route admin duplicate. Le pagine sono suddivise in due elenchi: funzioni utente e funzioni amministrative. Ogni elenco assegna esplicitamente il tipo di accesso e la guard, compresa `admin/bookings`. Il profilo richiede una sessione ed è condiviso dai due ruoli. Login e registrazione restano pubblici; il recupero password verrà aggiunto nel 3.10. Root e indirizzi sconosciuti portano al login, alla Home o alla dashboard secondo la sessione corrente.

2. **`session-guard.ts` e `admin-guard.ts`:** un visitatore viene indirizzato al login conservando la destinazione richiesta. Un account autenticato con ruolo incompatibile viene indirizzato alla propria pagina iniziale. Un admin non accede alle pagine di prenotazione utente; un user non accede alle pagine admin. Sono controlli di navigazione: la protezione effettiva dei dati resta nei middleware server.

3. **`return-url.ts`:** valida il parametro `returnUrl` contro le route riservate realmente configurate. Rifiuta URL esterni, percorsi sconosciuti, schermate di autenticazione, outlet secondari, parametri di matrice e percorsi malformati. Dopo login controlla anche il ruolo. Conserva query e frammento dei percorsi ammessi. Non usa localStorage e non accetta destinazioni arbitrarie.

4. **`access.page.ts/.html` e `auth-interceptor.ts`:** conservano la destinazione nel passaggio login → registrazione → login e dopo una sessione scaduta durante una richiesta API. Il login ritorna alla pagina ammessa oppure alla destinazione iniziale del ruolo. Un test browser ha evidenziato che Ionic può conservare un form con uno snapshot della route precedente: i parametri del form vengono quindi letti dall’URL corrente del Router, anche dopo Indietro. Logout volontario continua a tornare al login senza una destinazione da ripristinare.

5. **`check-in-entry.page.ts`:** aggiunge la destinazione protetta `/check-in/:id`, conforme al contratto QR. Per un ID positivo mostra lo spazio richiesto e comunica che il check-in non è ancora disponibile; per un ID malformato mostra un errore. Nessuna chiamata al check-in, ricerca di prenotazioni, verifica di presenza o modifica al database: la funzione reale appartiene al punto 4.

6. **Navigazione:** topbar e barra mobile del profilo mostrano collegamenti coerenti con il ruolo. Il profilo admin non mostra le voci utente sulle notifiche/segnalazioni. Le cinque pagine admin hanno un collegamento al profilo visibile anche quando l’identità nella sidebar viene nascosta su tablet o smartphone; dal profilo si può uscire. Aggiunte etichette accessibili ai collegamenti admin rappresentati soltanto da icone. Corretto il percorso relativo `admin/statistics` in `/admin/statistics` nella dashboard. Dati dimostrativi e funzioni applicative delle pagine non sono stati trasformati in dati reali in questo passo.

## Verifiche

- **38/38 test Angular mirati, nove file.** Include i test precedenti di autenticazione, form, refresh/logout, profilo e barre, più dieci test del 3.9 con Router reale e contenuti privati isolati. Verificate tutte le route per visitatore/user/admin, destinazioni iniziali, ritorni non ammessi, percorso QR attraverso registrazione/login, ruolo incompatibile, uscita, snapshot obsoleto di un form conservato e collegamenti delle barre.
- **Build development completa riuscita**, Node 24.19.0, fuori dal sandbox. Nessuna nuova dipendenza. Warning Browserslist preesistente. `git diff --check` senza errori.
- **Browser con backend reale e due account temporanei:** QR aperto senza sessione → login; collegamenti tra login/registrazione conservano il QR; login user → `/check-in/12`; navigazione Home/profilo; apertura diretta di `admin/bookings` da user → Home; logout e Indietro → login; login admin con destinazione utente → dashboard; Statistiche dalla dashboard → percorso corretto; profilo admin e logout. Verificati profilo desktop 1280×720 e navigazione admin mobile 390×844.
- Prove browser svolte su loopback **HTTP**; attributi Secure invariati. Il browser ha ripristinato la sessione di prova su una nuova apertura, ma questo non certifica il funzionamento HTTPS di produzione. Il problema del certificato locale non attendibile resta aperto per l’integrazione 3.12.
- Backend avviato senza `.env`, con segreto effimero e DB creato in una directory temporanea dedicata. Server fermati, DB temporaneo rimosso e account di prova terminati. DB operativo `backend/db/database.sqlite` ancora assente.
- Suite backend, suite frontend completa e build produzione non rieseguite. Restano le anomalie pregresse dei test non pertinenti e dei budget degli stili admin; non sono state alzate soglie o disabilitate verifiche.

## Confine del passo

Il 3.9 completa la separazione della navigazione e prepara il ritorno QR. Non implementa recupero/cambio password, cancellazione account, check-in effettivo o API del punto 4. Prossimo passo: **3.10 — Cambio e recupero password**, con servizio email ancora da configurare.
