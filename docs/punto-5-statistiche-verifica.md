# Statistiche amministratore — completamento e verifica

Intervento dell’8 settembre 2026 sul punto 5 già implementato nel commit d1226f5.

## Dati

La pagina richiede `GET /api/v1/admin/statistics` con `dateFrom` e `dateTo`. Il backend legge SQLite in transazione dopo il consolidamento delle occorrenze. Non vengono usati i dati dimostrativi di `src/app/data`.

- Prenotazioni: gruppi nelle fasce terminate e offerte con snapshot disponibile.
- Presenze: partecipanti con check-in; assenze: partecipanti meno presenze.
- Utilizzo: presenze / posti offerti storici; check-in completati: presenze / partecipanti.
- Le fasce offerte senza prenotazioni contribuiscono ai posti offerti.
- Segnalazioni: create nel periodo, classificate secondo categoria e stato attuale.
- Il grafico delle tipologie rappresenta la distribuzione delle presenze. Il centro mostra il numero di presenze, non un diverso tasso di utilizzo.
- Denominatori zero: N/D. Storia incompleta: avviso esplicito; nessuna ricostruzione inventata dei dati precedenti.

## Interfaccia

Layout a larghezza disponibile e passaggio mobile coerente con la sidebar a 900 px. Indicatori più compatti, pannelli distanziati, grafico scorrevole per periodi lunghi, date giorno/mese e scala intera coerente con le barre. Stati vuoti separati per grafici e presenze. Date reali validate prima della richiesta; una risposta pendente non sovrascrive nuove date inserite. Richiesta annullata alla distruzione del componente.

In Spazi amministratore, pannello QR e pulsante Chiudi QR hanno stile dedicato, hover e focus da tastiera.

## Verifiche

- 19 test backend superati: statistiche, consolidamento occorrenze e API HTTP del punto 5, su database temporanei.
- 11 test frontend mirati superati: Statistiche e Spazi admin, inclusi aggiornamento del DOM, date e stati vuoti.
- Build production riuscita (codice 0), senza aumentare i budget; restano warning CSS e CommonJS.
- Browser disponibile reindirizzato al login: controllo visivo autenticato desktop/mobile ancora da eseguire. Nessuna sessione amministratore creata sul database dell’utente.
- Database operativo non modificato; nessuna operazione Git di scrittura.
