# Punto 3 — Autenticazione e account

Completato localmente sul branch `Backend`, senza commit o push. Sono stati completati i sottopassi 3.2–3.12.

Il backend ora valida e verifica password scrypt, registra e autentica account, gestisce JWT e refresh token ruotati, protegge le API con ruolo e sessione corrente, effettua refresh e logout, cambia password, recupera password tramite SMTP configurabile e cancella account con transazioni. Il recupero risponde sempre `204` per email valide; la nuova password viene generata solo in memoria, inviata tramite SMTP e salvata come hash soltanto dopo l’invio riuscito. SMTP non configurato o non raggiungibile non modifica l’account.

La cancellazione richiede la password corrente e il ruolo `user`. Elimina prima le prenotazioni organizzate, notifica gli altri partecipanti futuri, rimuove le partecipazioni altrui, dati personali, sessioni e richieste idempotenti. Le fotografie sono gestite tramite una coda tecnica persistente, ritentata all’avvio, senza promettere atomicità impossibile tra SQLite e filesystem. Sono presenti limiti in memoria per login, registrazione, refresh, recupero e operazioni account.

Il frontend collega login, registrazione, rinnovo, logout, cambio password, recupero e cancellazione. Le guard separano visitor, user e admin; le route duplicate sono state rimosse; le destinazioni interne, compreso `/check-in/:id`, vengono conservate e validate senza open redirect. Il check-in effettivo e le funzioni applicative del punto 4 restano fuori dal punto 3.

Verifiche eseguite prima dell’ultima rifinitura CSS: **75/75 test backend e 69/69 test frontend**. La build di produzione aveva superato la compilazione ma falliva i budget per cinque fogli admin; le pagine sono state suddivise in componenti condivisi e l’ultimo residuo di `admin-bookings` è stato ridotto senza aumentare i budget. La riesecuzione finale fuori sandbox è stata bloccata dal limite di utilizzo dell’ambiente; la build sandbox termina invece con il limite EPERM noto. Restano warning Browserslist e Leaflet CommonJS.

Le prove integrate hanno usato database temporanei, account temporanei e un SMTP TLS locale di test; il database operativo non è stato creato o modificato. Nessun segreto reale è stato scritto nei file. Il certificato HTTPS locale non attendibile impedisce ancora la prova browser del ciclo Secure in 3.12.
