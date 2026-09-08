# Verifica finale dei flussi del punto 4

Riavviare il backend per caricare le modifiche. Usare il database di prova configurato, non quello operativo. Le azioni seguenti modificano dati di prova e inviano notifiche interne agli account di prova.

1. Admin → Spazi: modificare nome, edificio, servizi e stato; riaprire il modulo e controllare i valori salvati. Provare filtri e paginazione se sono presenti più di 20 spazi.
2. Admin → Disponibilità: scegliere un giorno futuro, creare una fascia, modificarla e verificarne la nuova versione nell'elenco. L'utente deve vedere le fasce attive per lo stesso giorno della settimana e periodo.
3. Utente → Nuova prenotazione: aggiungere le email di due account di prova. Il conteggio deve includere l'organizzatore. Conferma: controllare aula, data, orario e codice effettivi.
4. Prenotazioni → Dettaglio e partecipanti: l'organizzatore aggiunge/rimuove un partecipante; quest'ultimo può abbandonare. Provare anche dopo il termine consentito: il server deve rifiutare. Verificare le notifiche degli interessati.
5. Admin → Prenotazioni: verificare prenotazione, organizzatore, partecipanti e check-in senza dati dimostrativi. Tornare alla pagina dopo una nuova prenotazione senza ricaricare il browser.
6. Aprire il QR dello spazio dalla conferma o da Spazi admin. Scansionarlo su un altro dispositivo usando un indirizzo dell'app raggiungibile e HTTPS attendibile; il login deve tornare al check-in corretto. Ripetere un check-in valido: deve conservare il primo orario.
7. Segnalazioni: allegare una foto e aprirla come autore e come admin; cambiare lo stato e verificare la notifica persistente dell'autore.
8. Preferiti e notifiche: navigare avanti/indietro e ricaricare; controllare persistenza e accesso alle pagine successive.
9. Ripetere i nuovi moduli su schermo mobile, controllando focus, pulsanti, assenza di sovrapposizioni e scorrimento.

Non pubblicare chiavi, cookie o token nei risultati del collaudo. Annotare per un errore la pagina, l'azione e il messaggio visibile; i test automatici già superati non sostituiscono queste prove di interfaccia.
