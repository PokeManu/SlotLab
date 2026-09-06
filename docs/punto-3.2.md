# Punto 3.2 — Validazione dei dati e verifica password

Implementato il 6 settembre 2026 sul branch `Backend`, dopo l'aggiornamento al commit `e3c0b1d`.

## Codice

- `backend/security/validation.js`: raccoglie i controlli prima presenti nel seed. `validateEmail` controlla il tipo, rimuove gli spazi esterni, converte in minuscolo e verifica il formato. `validatePassword` accetta 8–64 caratteri, maiuscola, minuscola, cifra e speciale, senza whitespace; restituisce la stringa originale o genera un errore generico senza includere il valore ricevuto. `normalizeAndValidateAccount` controlla i quattro campi obbligatori, elimina gli spazi esterni da nome/cognome e riusa le due funzioni.
- `backend/security/password.js`: `hashPassword` valida prima di calcolare l'hash. `verifyPassword` e asincrona e restituisce un booleano: controlla tipo/lunghezza dell'input, struttura dell'hash e parametri esatti, ricava la chiave dal sale salvato e confronta i buffer con `crypto.timingSafeEqual`. La verifica non modifica la password e non ripete i controlli di complessita delle nuove password. Gli errori operativi di scrypt restano errori da gestire nel futuro flusso HTTP.
- `backend/db/seed.js`: usa la validazione condivisa prima di aprire il database. Restano invariati ruolo admin, idempotenza, mancata promozione degli user e conservazione della password di un admin esistente.
- `backend/test/password.test.js`: nove test dedicati. `backend/test/backend.test.js`: estese le prove del seed per verificare realmente l'hash e la conservazione della password originale.
- `backend/README.md`: aggiornati struttura e comandi di verifica.

Il formato rimane `scrypt$16384$8$1$<sale hex>$<chiave hex>`, con sale di 16 byte, chiave di 64 byte e memoria massima di 64 MiB. Sono accettati gli hash esadecimali minuscoli prodotti dal codice esistente. Il controllo preliminare della lunghezza di 178 caratteri evita anche di elaborare hash arbitrariamente grandi. I parametri letti dall'hash non vengono passati a scrypt: il calcolo usa le costanti locali.

La validazione mantiene i criteri precedenti del seed: lunghezza JavaScript `string.length`, lettere A–Z/a–z, cifre 0–9 e carattere speciale diverso da questi, escluso whitespace. Il controllo email resta quello sintattico gia presente; non verifica l'esistenza della casella. Le funzioni non assegnano ruoli e non gestiscono risposte HTTP: rifiuto del campo `role`, unicita email e traduzione degli errori nei codici API appartengono alla registrazione del punto 3.3.

## Verifiche

Ambiente: Node 24.19.0 installato localmente, invocato tramite percorso assoluto perche non presente nel PATH della shell.

- `node --test test/password.test.js`: **9/9 superati**.
- `node --test test/*.test.js`, equivalente allo script `npm test`: **26/26 superati**. Nel sandbox il solo test HTTP falliva con `listen EPERM`; riesecuzione autorizzata fuori dal sandbox completata con successo.
- Provati limiti 8/64, categorie mancanti, whitespace anche Unicode e ai bordi, tipi errati, password corretta/errata, sali diversi e compatibilita con il formato precedente.
- Hash malformati o parametri alterati restituiscono false senza invocare scrypt, verificato con mock della funzione crittografica.
- Seed verificato su DB temporaneo: l'hash autentica la password iniziale e una seconda esecuzione con password diversa non la sostituisce. Input non valido rifiutato prima di creare il DB.
- Database operativo assente prima e dopo le prove. Nessun `.env` operativo caricato dai test.
- Frontend e build non rieseguiti: nessuna modifica frontend in questo passo. Restano gli esiti storici del punto 3.1.

## Confine del passo

Nessuna nuova dipendenza, migrazione, route o sessione. Registrazione e login non sono ancora implementati. Il prossimo passo e **3.3 — Registrazione HTTP**, da autorizzare separatamente.
