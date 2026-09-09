# Finalizzazione del database

## Backup

Prima delle modifiche è stato copiato integralmente il database configurato in `backend/db/backups/2026-09-09-pre-finalization/database.sqlite`. Il relativo manifest contiene dimensione e SHA-256. Il file originale non è stato modificato durante analisi e verifiche.

Il database definitivo è `backend/db/database.sqlite`; una seconda copia verificata è disponibile in `backend/db/backups/2026-09-09-final/database.sqlite`. La configurazione locale usa ora il percorso predefinito del progetto.

Un processo Node già avviato prima della modifica continua a mantenere aperto il precedente database temporaneo fino al proprio riavvio. Dopo il riavvio, gli script caricati da `.env` useranno il database definitivo predefinito.

## Schema

Le migrazioni 1–5 sono rimaste immutate. La migrazione 6 aggiunge 15 indici per chiavi esterne e filtri realmente usati dalle API. Vincoli, relazioni e cancellazioni a cascata esistenti hanno superato `integrity_check` e `foreign_key_check`.

## Dati iniziali

- Mantenuti: account amministratore esistente e hash della sua password; cinque servizi approvati.
- Importati/verificati: edifici 2–19 da `src/app/data/campus-buildings.data.ts`; Aula Studio A1, Sala Riunioni B e Laboratorio Reti da `src/app/data/spaces.data.ts`.
- Disponibilità bootstrap: lunedì–venerdì, 08:00–20:00, per i tre spazi.
- Rimossi dal candidato: sei account `@demo.slotlab.test`, l’account `Test Test`, dodici prenotazioni demo, relative partecipazioni/richieste, fasce demo, snapshot demo e sessioni transitorie.
- Non importati: `Lavagna` e `Monitor`, perché non fanno parte dei cinque codici ammessi dallo schema. Per Sala Riunioni B è stato rimosso il proiettore non presente nel file sorgente. Destinazioni d’uso, numero di piani e immagini non hanno colonne corrispondenti nello schema attuale e restano nei file frontend.
- Non ricostruibili: spazi degli edifici diversi dal 6 e dal 9; la cartella `data` non ne specifica nome, piano, tipologia, capienza, accessibilità o servizi.

Lo script demo richiede ora `SLOTLAB_DEMO_DB_PATH` e rifiuta il percorso se coincide con `SLOTLAB_DB_PATH`.

## Verifiche

- Suite backend: 114/114 test superati su database temporanei.
- Ricreazione da zero: 6 migrazioni, 18 edifici, 3 spazi, 5 servizi e 15 disponibilità.
- Ripristino: SHA-256 identico, integrità SQLite valida e nessuna violazione di chiave esterna.
- Avvio su copia temporanea: health check, registrazione, login e lettura dei 18 edifici riusciti.
