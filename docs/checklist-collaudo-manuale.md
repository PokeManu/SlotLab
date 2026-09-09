# Checklist completa di collaudo manuale di SlotLab

Questa checklist verifica il comportamento visibile dell'applicazione e l'integrazione reale tra Angular, Express e SQLite. Usare una copia separata del database: alcune prove creano, modificano ed eliminano dati.

## 1. Preparazione dell'ambiente di collaudo

- [ ] Creare o scegliere un database esclusivamente di prova, per esempio `/private/tmp/slotlab-acceptance.sqlite`.
- [ ] Verificare che `backend/.env` contenga `SLOTLAB_DB_PATH` con il percorso assoluto del database di prova.
- [ ] Verificare che `SLOTLAB_JWT_SECRET` sia valorizzato con 64 caratteri esadecimali, senza copiarlo nel verbale.
- [ ] Impostare `SLOTLAB_UPLOAD_DIR` su una cartella di prova assoluta e scrivibile se si vogliono verificare gli allegati.
- [ ] Configurare SMTP e una casella di prova se si vuole certificare anche il recupero password.
- [ ] Eseguire migrazioni e seed principale sul database di prova.
- [ ] Facoltativo: eseguire `npm run db:seed-demo --prefix backend` per ottenere tre fasce giornaliere per ogni spazio e dati storici per le statistiche. Lo script rifiuta il database operativo.
- [ ] Creare tramite registrazione almeno tre account normali: `U1` organizzatore, `U2` e `U3` partecipanti. Usare caselle email controllabili.
- [ ] Creare l'amministratore tramite seed, senza riutilizzare l'email di un utente normale.
- [ ] Conservare due spazi attivi con capienza sufficiente, uno spazio accessibile e uno spazio da usare nelle prove distruttive.
- [ ] Avviare il backend dalla cartella `backend` con `npm start` e controllare il messaggio di ascolto sulla porta prevista.
- [ ] Avviare il frontend in HTTPS con `npm run start:https` oppure `ionic serve --ssl`.
- [ ] Aprire `/api/v1/missing` dall'origine del frontend: deve apparire un errore JSON `ROUTE_NOT_FOUND`, non la pagina Angular.
- [ ] Aprire gli strumenti sviluppatore e attivare “Preserve log”. Durante ogni prova controllare che non compaiano eccezioni console o richieste 4xx/5xx inattese.
- [ ] Annotare versione del browser, sistema operativo, dimensione dello schermo, database usato e data/ora del collaudo.

## 2. Criterio da applicare a ogni prova

Una voce è superata soltanto se:

- [ ] l'azione produce il risultato visibile atteso;
- [ ] la richiesta di rete termina con lo stato HTTP previsto e usa dati reali;
- [ ] il risultato rimane corretto dopo ricaricamento completo della pagina;
- [ ] tornando alla schermata tramite navigazione, l'elenco si aggiorna senza richiedere un secondo reload;
- [ ] non compaiono dati statici, duplicati, sovrapposizioni, elementi senza stile o errori in console;
- [ ] un errore dell'utente mostra un messaggio comprensibile e non lascia l'interfaccia bloccata.

## 3. Accesso pubblico e autenticazione

### Registrazione

- [ ] Da utente disconnesso, `/`, una route utente e una route admin portano al login.
- [ ] Aprire Registrazione dal login e controllare navigazione, titoli, campi e pulsanti.
- [ ] Provare nome o cognome vuoto, email malformata e password non conforme: il form deve bloccare l'invio o mostrare l'errore corretto.
- [ ] Provare una password senza maiuscola, senza minuscola, senza cifra, senza carattere speciale, con spazi, più corta di 8 e più lunga di 64 caratteri.
- [ ] Registrare `U1` con dati validi: deve essere creato come utente normale e deve essere richiesto il login.
- [ ] Ripetere la registrazione con la stessa email usando maiuscole o spazi esterni: il duplicato deve essere rifiutato.
- [ ] Verificare che non esista alcun controllo client capace di registrare un ruolo amministratore.

### Login, sessione e ruoli

- [ ] Provare email inesistente e password errata: entrambi devono mostrare un errore generico, senza rivelare quale dato sia sbagliato.
- [ ] Accedere come `U1`: la destinazione deve essere la Home utente e il profilo deve contenere i dati di `U1`.
- [ ] Ricaricare la pagina: la sessione deve essere recuperata tramite cookie e la pagina deve rimanere autenticata.
- [ ] Incollare direttamente una route admin mentre si è `U1`: l'utente non deve vedere contenuti amministrativi.
- [ ] Accedere come admin: la destinazione deve essere Panoramica e le route utente operative non devono essere utilizzabili dall'admin.
- [ ] Da autenticato, provare ad aprire `/login` e `/register`: non devono riaprire i form pubblici.
- [ ] Aprire lo stesso account in due browser/profili, effettuare un nuovo login nel secondo e poi usare il primo: la vecchia sessione deve risultare revocata.
- [ ] Lasciare scadere o simulare il rinnovo dell'access token mantenendo il refresh valido: una singola richiesta di refresh deve ripristinare la sessione senza perdere la pagina corrente.
- [ ] Premere Esci: tornare al login; indietro, reload e URL diretto non devono riaprire pagine protette.
- [ ] Ripetere logout dopo una sessione già terminata: l'interfaccia deve restare stabile.

### Recupero e cambio password

- [ ] Aprire Password dimenticata e inviare un'email sintatticamente errata: deve essere rifiutata.
- [ ] Inviare un'email valida inesistente: la risposta visibile deve essere uniforme e non rivelare l'assenza dell'account.
- [ ] Con SMTP configurato, richiedere il recupero di `U3`, ricevere la nuova password e verificare che la vecchia non funzioni più.
- [ ] Accedere con la password ricevuta; la sessione precedente di `U3` deve essere invalidata.
- [ ] Dal Profilo cambiare password inserendo una password corrente errata: nessun cambiamento deve essere salvato.
- [ ] Cambiare password correttamente e verificare logout automatico, rifiuto della vecchia password e accesso con la nuova.

## 4. Funzioni condivise dell'account

- [ ] Il Profilo mostra nome, cognome, email e ruolo reali dell'account corrente.
- [ ] Cliccare direttamente l'avatar e caricare una JPEG, PNG e WebP valida entro 2 MB: l'anteprima deve aggiornarsi e restare dopo reload e nuovo login.
- [ ] Provare file non immagine, contenuto con estensione falsificata e immagine oltre 2 MB: devono essere rifiutati.
- [ ] Rimuovere la foto: devono ricomparire le iniziali anche dopo reload.
- [ ] Cambiare tema chiaro/scuro dal Profilo e dai controlli disponibili: testo, sfondi, bordi, input, icone, mappe e modali devono restare leggibili.
- [ ] Ricaricare e riaprire l'app: la scelta del tema deve essere conservata.
- [ ] Cambiare tema come user e come admin, verificando tutte le rispettive barre di navigazione.

## 5. Home utente

- [ ] Al primo caricamento diretto della Home compaiono subito gli spazi consigliati, senza passare prima da un'altra route.
- [ ] Sono mostrati al massimo tre spazi distinti e i dati corrispondono al catalogo reale.
- [ ] Se esistono fasce prenotabili oggi, i consigli riguardano soltanto oggi; domani viene usato solo quando oggi non offre risultati.
- [ ] “Vedi tutti” apre Spazi.
- [ ] Ogni card apre il dettaglio dello spazio corretto e mostra l'immagine coerente con la tipologia.
- [ ] La mappa carica, mantiene una sola istanza e mostra gli edifici; zoom e spostamento funzionano.
- [ ] Selezionare un marker: devono apparire edificio e relativi spazi; un edificio senza spazi deve mostrare uno stato vuoto.
- [ ] La sezione Prossima prenotazione mostra la prenotazione futura più vicina di `U1`.
- [ ] “Apri prenotazione” apre il dettaglio della prenotazione esistente, senza ricominciare il flusso di creazione.
- [ ] Dopo creazione o cancellazione di una prenotazione, Home deve aggiornarsi tornando alla pagina senza reload manuale.

## 6. Catalogo Spazi e dettaglio

- [ ] Al primo accesso diretto a Spazi compaiono gli spazi reali attivi e quelli non prenotabili con stato corretto.
- [ ] Cercare per nome dello spazio, nome edificio e numero edificio; provare maiuscole/minuscole e nessun risultato.
- [ ] Verificare separatamente i filtri Disponibili ora, Accessibili e Posti almeno 10.
- [ ] Verificare le combinazioni dei filtri e il loro azzeramento.
- [ ] “Posti almeno 10” usa i posti liberi della prima fascia prenotabile; insieme a Disponibili ora può scegliere una fascia successiva che raggiunge la soglia.
- [ ] Filtri e ricerca non inviano parametri vuoti o `null` che azzerano erroneamente il catalogo.
- [ ] Se ci sono più risultati della dimensione pagina, verificare avanti, indietro, totale e disabilitazione delle frecce ai limiti.
- [ ] Aprire ogni tipologia di spazio: aula studio, laboratorio e sala riunioni devono avere immagine, testo e icona coerenti.
- [ ] Il dettaglio mostra edificio, piano, accessibilità, stato, servizi e relativa icona corretta: Wi-Fi, prese, proiettore, computer e aria condizionata.
- [ ] L'utente normale non deve vedere il QR dello spazio.
- [ ] I posti disponibili devono cambiare in base alla data/fascia e alle prenotazioni reali, senza superare la capienza totale.
- [ ] Uno spazio in manutenzione o disattivato resta consultabile ma non prenotabile.
- [ ] Il comando per creare una segnalazione apre il form già associato allo spazio corretto.

## 7. Preferiti

- [ ] Aggiungere due o più spazi ai preferiti: aggiungere il secondo non deve rimuovere il primo.
- [ ] Le icone preferito devono restare coerenti tra Home, Spazi, dettaglio e pagina Preferiti.
- [ ] Aprire Preferiti subito dopo l'aggiunta: l'elenco deve aggiornarsi senza reload.
- [ ] Rimuovere un preferito dalla pagina Preferiti: soltanto quello spazio deve essere rimosso.
- [ ] Tornare a Spazi: le altre icone preferito devono restare attive.
- [ ] Ricaricare e rifare il login: i preferiti devono persistere.
- [ ] Aggiungere ai preferiti anche uno spazio pieno, in manutenzione o disattivato.
- [ ] Verificare stato vuoto e paginazione con un numero sufficiente di preferiti.

## 8. Nuova prenotazione e conferma

- [ ] Dal dettaglio aprire Nuova prenotazione dello stesso spazio.
- [ ] Cliccare in ogni punto del riquadro data: il calendario deve aprirsi; l'icona deve essere centrata.
- [ ] Non devono essere selezionabili date passate o oltre i 30 giorni.
- [ ] Scelta una data valida, devono apparire soltanto le fasce attive per quel giorno, periodo e spazio.
- [ ] Una fascia ritirata non deve comparire; una nuova fascia inserita dall'admin deve comparire senza dati statici.
- [ ] Una fascia coperta da indisponibilità, già iniziata o troppo vicina all'inizio non deve essere prenotabile.
- [ ] I posti liberi mostrati devono diminuire in base a organizzatore e partecipanti già prenotati.
- [ ] Usare i pulsanti meno/più dei partecipanti: per ogni partecipante aggiuntivo deve apparire un campo email.
- [ ] Verificare email malformata, duplicata, uguale all'organizzatore e account inesistente: la prenotazione deve essere rifiutata senza salvataggi parziali.
- [ ] Creare una prenotazione con `U1` organizzatore e `U2`/`U3` partecipanti; il totale deve includere l'organizzatore.
- [ ] Premere Conferma rapidamente due volte o ripetere la stessa richiesta: deve nascere una sola prenotazione.
- [ ] La conferma deve mostrare codice/ID, spazio, edificio, data, fascia e numero partecipanti reali.
- [ ] La nuova prenotazione deve comparire subito in Prenotazioni, Home e area admin senza reload manuale.
- [ ] Provare una prenotazione che supera la capienza: nessun posto deve essere assegnato parzialmente.
- [ ] Provare una sovrapposizione per `U1`, poi per `U2` invitato: entrambe devono essere bloccate.
- [ ] Arrivare a cinque prenotazioni future attive per una persona e provare la sesta: deve essere bloccata anche se la persona è partecipante e non organizzatore.
- [ ] Verificare che due fasce consecutive siano consentite.

## 9. Prenotazioni e partecipanti utente

- [ ] La scheda Prenotazioni future mostra tutte e sole le prenotazioni future a cui l'utente partecipa.
- [ ] La scheda Passate mostra quelle concluse; una prenotazione cancellata non deve comparire perché viene eliminata, non archiviata come “annullata”.
- [ ] In assenza di prenotazioni deve comparire un messaggio che parla di prenotazioni, non di segnalazioni.
- [ ] Il selettore mese/calendario si apre cliccando l'intero controllo, è centrato e filtra correttamente l'elenco.
- [ ] “Dettaglio e partecipanti” non ha sottolineature spurie e apre una pagina coerente con il resto dell'app.
- [ ] Il dettaglio mostra organizzatore, partecipanti, ruoli e stato di presenza corretti.
- [ ] Come organizzatore aggiungere `U2`: deve comparire subito e `U2` deve ricevere una notifica persistente.
- [ ] Aggiungere nuovamente `U2` deve essere rifiutato senza duplicarlo.
- [ ] Come organizzatore rimuovere `U2`: deve sparire subito e ricevere una notifica.
- [ ] Come `U2`, abbandonare una prenotazione altrui: deve essere rimossa solo la sua partecipazione.
- [ ] L'organizzatore non deve poter abbandonare lasciando il gruppo senza organizzatore.
- [ ] Entro un'ora dall'inizio, aggiunta/rimozione/abbandono devono essere bloccati.
- [ ] Premere Annulla come organizzatore oltre un'ora prima: prenotazione e partecipazioni devono sparire e gli altri utenti devono essere notificati.
- [ ] Un partecipante non organizzatore non deve poter cancellare l'intera prenotazione.
- [ ] Provare cancellazione entro un'ora: deve essere rifiutata e la prenotazione deve restare visibile.

## 10. QR e check-in

- [ ] Come admin, Spazi → QR apre il QR dello spazio corretto; “Chiudi QR” è visibile, stilizzato e funzionante.
- [ ] Il QR usa un URL raggiungibile dal telefono e l'ID dello spazio corretto.
- [ ] Scansionare il QR da disconnesso: dopo il login si deve tornare al check-in dello stesso spazio.
- [ ] Scansionarlo con un utente che non partecipa a una prenotazione valida: accesso negato con messaggio chiaro.
- [ ] Scansionarlo con il partecipante giusto ma per uno spazio diverso: accesso negato.
- [ ] Provare prima di 15 minuti dall'inizio: check-in non ancora consentito.
- [ ] Provare tra 15 minuti prima e 30 minuti dopo l'inizio: deve apparire “Accesso consentito”.
- [ ] Ripetere il check-in: deve risultare già effettuato e mantenere il primo orario.
- [ ] Provare oltre 30 minuti dall'inizio: deve apparire “Check-in scaduto”.
- [ ] Nell'area admin Prenotazioni, il partecipante deve risultare presente con l'orario reale; gli altri restano assenti/non registrati.

## 11. Segnalazioni utente

- [ ] Creare una segnalazione per ciascuna categoria: tecnica, accessibilità, pulizia e altro.
- [ ] La descrizione vuota deve essere rifiutata.
- [ ] Verificare l'assegnazione automatica della priorità: tecnica/accessibilità alta, pulizia media, altro bassa.
- [ ] Creare una segnalazione senza foto e una con JPEG, PNG o WebP valida entro 5 MB.
- [ ] Provare file oltre 5 MB, formato non ammesso e contenuto falso: devono essere rifiutati senza creare file orfani o record parziali.
- [ ] Dopo l'invio, Le mie segnalazioni deve aggiornarsi immediatamente.
- [ ] La segnalazione deve restare dopo reload e nuovo login.
- [ ] Aprire il dettaglio e la foto come autore; un altro utente non deve poter leggere la segnalazione o l'allegato.
- [ ] Stato, priorità, spazio, descrizione, data e foto devono coincidere con quanto salvato.
- [ ] L'utente non deve poter modificare o eliminare una segnalazione inviata.

## 12. Notifiche utente

- [ ] Il contatore nella topbar si aggiorna dopo un nuovo evento senza mostrare elementi sovrapposti.
- [ ] Aprire Notifiche: titolo, descrizione e data devono essere separati e leggibili anche su mobile.
- [ ] Aprire una notifica singola o marcarla letta: cambia soltanto quella notifica e il conteggio diminuisce.
- [ ] “Segna tutte come lette” aggiorna elenco e contatore.
- [ ] Ricaricare la pagina: stato letto/non letto e notifiche devono persistere.
- [ ] Verificare almeno questi eventi: prenotazione creata, partecipante aggiunto, partecipante rimosso, prenotazione cancellata, spazio/fascia resa indisponibile, segnalazione aggiornata e avviso globale.
- [ ] L'utente non deve poter cancellare o disattivare manualmente le notifiche.

## 13. Navigazione e Profilo utente

- [ ] Desktop: Home, Spazi, Prenotazioni e Preferiti portano alla route corretta; avatar apre Profilo e campanella apre Notifiche.
- [ ] Mobile: Home, Cerca/Spazi, Prenotazioni, Preferiti e Profilo compaiono una sola volta e sono utilizzabili.
- [ ] La voce attiva cambia correttamente dopo navigazione diretta, avanti/indietro e reload.
- [ ] Nessun link, pulsante o card cliccabile deve rimanere senza funzione.

## 14. Panoramica amministratore

- [ ] Le card mostrano conteggi reali di spazi, utenti, prenotazioni e segnalazioni.
- [ ] Prenotazioni recenti e segnalazioni recenti corrispondono ai dati creati nel collaudo.
- [ ] “Vedi calendario” apre Prenotazioni e gli altri collegamenti aprono la sezione corretta.
- [ ] Dopo una nuova prenotazione o segnalazione, tornando alla Panoramica i dati devono aggiornarsi senza reload.
- [ ] Sidebar e topbar mostrano icone univoche, Profilo in alto e nessun comando ridondante.

## 15. Edifici amministratore

- [ ] L'elenco contiene gli edifici reali previsti dal catalogo UniPa, con numero, nome e coordinate coerenti.
- [ ] Creare un edificio di prova con dati validi e verificarne comparsa nella mappa e nei selettori.
- [ ] Provare campi vuoti, numero non valido, duplicato e coordinate non valide: nessun record parziale.
- [ ] Modificare nome, numero e coordinate; verificare persistenza dopo reload e aggiornamento nella parte utente.
- [ ] Cercare e scorrere l'elenco su desktop e mobile.
- [ ] Rimandare l'eliminazione dell'edificio alla sezione delle prove distruttive.

## 16. Spazi amministratore

- [ ] Ricerca, filtri Edificio/Tipologia/Stato, combinazioni e paginazione lavorano sui dati reali.
- [ ] Aprire Aggiungi spazio: campi, select, checkbox Accessibile e checkbox servizi devono essere allineati e cliccabili anche sul testo.
- [ ] Creare uno spazio di prova con ciascuna tipologia e servizi diversi; verificare la parte utente.
- [ ] Provare nome vuoto, edificio assente, capienza zero/negativa, tipologia o stato non valido.
- [ ] Modificare edificio, nome, piano, tipologia, capienza, accessibilità, servizi e stato; riaprire il form e verificare i valori salvati.
- [ ] Ridurre la capienza sotto i posti già impegnati: l'operazione deve essere rifiutata.
- [ ] Cambiare stato in manutenzione/disattivato: prenotazioni future coinvolte devono essere gestite e notificate secondo il flusso previsto.
- [ ] Aprire e chiudere il QR più volte; il pannello non deve coprire sidebar o controlli.
- [ ] Rimandare l'eliminazione alla sezione delle prove distruttive.

## 17. Disponibilità amministratore

- [ ] Selezionare ogni spazio e verificare che vengano caricate solo le sue fasce e indisponibilità.
- [ ] Creare almeno tre fasce non sovrapposte per un giorno e verificare che l'utente le veda nella data corrispondente.
- [ ] Creare fasce consecutive: devono essere accettate.
- [ ] Provare intervallo data invertito, orario finale precedente/uguale all'inizio e sovrapposizione: devono essere rifiutati.
- [ ] Modificare una fascia: la precedente deve risultare ritirata e la nuova versione attiva.
- [ ] Ritirare una fascia: deve sparire dal flusso utente e comparire nello storico ritirate.
- [ ] Mostrare/Nascondere fasce ritirate e usare Riutilizza: il modulo deve essere precompilato e creare una nuova versione modificabile.
- [ ] Con più di dieci righe, deve scorrere l'interno del riquadro senza obbligare a scorrere tutta la pagina.
- [ ] Pulsanti Modifica e Ritira devono essere separati, leggibili e non sovrapposti.
- [ ] Creare un'indisponibilità eccezionale con motivo: deve comparire nell'elenco admin e bloccare la fascia utente.
- [ ] Se l'indisponibilità copre prenotazioni future, queste devono essere cancellate e tutti i partecipanti devono ricevere notifiche.
- [ ] Modificare e rimuovere un'indisponibilità; dopo la rimozione le fasce future compatibili devono tornare prenotabili.
- [ ] Provare a intervenire su una fascia già in corso: l'operazione non deve forzare cancellazioni non consentite.

## 18. Prenotazioni amministratore

- [ ] L'elenco mostra soltanto prenotazioni reali, incluse future e completate, senza righe statiche.
- [ ] Nuove prenotazioni compaiono tornando alla pagina senza reload manuale.
- [ ] Filtrare/cercare per i controlli disponibili e verificare paginazione e stati vuoti.
- [ ] Selezionare una riga: il pannello dettaglio deve aggiornarsi con spazio, organizzatore, data, fascia e partecipanti della riga scelta.
- [ ] L'eventuale icona occhio deve avere una funzione chiara; se il dettaglio è sempre aperto, non deve essere presente un controllo inerte.
- [ ] Verificare ruoli dei partecipanti, presenza e orario di check-in.
- [ ] La sidebar deve essere uguale alle altre pagine admin e consentire uscita tramite Profilo.

## 19. Segnalazioni amministratore

- [ ] L'elenco mostra immediatamente le segnalazioni reali appena create, senza reload.
- [ ] Ogni riga mostra chiaramente lo stato attuale: Aperta, In lavorazione o Risolta.
- [ ] Ricerca, filtri, selezione e paginazione lavorano sui dati reali.
- [ ] Aprire il dettaglio: autore, spazio, categoria, priorità, descrizione, date, stato e allegato devono essere corretti.
- [ ] La foto protetta deve caricarsi e non risultare accessibile senza sessione admin.
- [ ] Passare da Aperta a In lavorazione e poi Risolta; “Salva aggiornamento” deve aggiornare elenco e dettaglio e persistere dopo reload.
- [ ] L'autore deve ricevere una notifica persistente per ogni aggiornamento previsto.
- [ ] Tentare una transizione o uno stato non valido: nessuna modifica parziale.

## 20. Utenti amministratore

- [ ] L'elenco contiene utenti normali reali e non espone password/hash o dati di sessione.
- [ ] Cercare per nome, cognome ed email, inclusi testi senza risultati.
- [ ] Aprire il dettaglio di un utente e verificare i dati pubblici previsti.
- [ ] L'admin non deve poter cambiare profilo, password o ruolo dell'utente.
- [ ] Non deve essere possibile eliminare un altro amministratore tramite il flusso utenti.
- [ ] Rimandare l'eliminazione di un account normale alla sezione delle prove distruttive.

## 21. Avvisi amministratore

- [ ] Pubblicare un avviso con titolo e messaggio validi.
- [ ] Gli utenti normali già esistenti devono ricevere una notifica; gli admin non devono riceverla.
- [ ] Registrare un nuovo utente dopo la pubblicazione: non deve ricevere retroattivamente l'avviso.
- [ ] Verificare persistenza dopo reload e lettura singola/totale lato utente.
- [ ] Provare titolo o messaggio vuoto e valori oltre i limiti: nessun invio parziale.
- [ ] Un doppio clic durante l'invio non deve creare duplicati involontari.

## 22. Statistiche amministratore

- [ ] Aprire Statistiche e verificare che i dati arrivino dall'API, non da `src/app/data`.
- [ ] Cliccare l'intero campo data Dal e Al; entrambi i calendari devono aprirsi.
- [ ] Su mobile “Dal” e “Al” devono restare leggibili su una riga, con Applica sotto.
- [ ] Provare Dal successivo ad Al, data non valida e periodo ammesso: gli errori devono essere chiari.
- [ ] Per un periodo senza dati devono apparire stati vuoti o `N/D`, non percentuali inventate.
- [ ] Per un periodo con dati verificare prenotazioni, partecipanti, presenze e assenze contando un piccolo campione a mano.
- [ ] Verificare `tasso utilizzo = presenze / posti offerti × 100` sulle sole fasce terminate e offerte.
- [ ] Verificare `check-in completati = presenze / partecipanti prenotati × 100`.
- [ ] Una fascia terminata offerta senza prenotazioni deve aumentare i posti offerti.
- [ ] Fasce future, in corso o indisponibili non devono alterare i risultati.
- [ ] Verificare spazi più prenotati, fasce più usate e distribuzione per tipologia.
- [ ] Verificare conteggi segnalazioni per categoria e stato nel periodo.
- [ ] Il centro del grafico tipologie deve mostrare le presenze.
- [ ] Un periodo lungo deve mantenere il grafico consultabile tramite scorrimento interno.
- [ ] Se la storia degli snapshot è incompleta deve comparire l'avviso previsto.
- [ ] Modificare le date mentre una richiesta è in corso: una risposta vecchia non deve sovrascrivere l'ultima selezione.

## 23. Eliminazioni e cascata — eseguire per ultime

- [ ] Come `U3`, eliminare il proprio account con password errata: l'account deve restare.
- [ ] Eliminare `U3` con password corretta: logout immediato e login successivo impossibile.
- [ ] Le prenotazioni organizzate da `U3` devono essere eliminate; dalle prenotazioni altrui deve sparire solo la partecipazione di `U3`.
- [ ] Gli altri partecipanti delle prenotazioni cancellate devono ricevere la notifica prevista.
- [ ] Come admin eliminare un utente normale di prova e verificare lo stesso comportamento su prenotazioni e partecipazioni.
- [ ] Eliminare uno spazio di prova con prenotazioni, preferiti, fasce, segnalazioni e foto: le dipendenze devono sparire e gli utenti interessati devono essere notificati.
- [ ] Verificare che il file foto associato allo spazio eliminato non resti inutilmente nella cartella upload.
- [ ] Eliminare un edificio di prova con i suoi spazi e verificare mappa, catalogo e dipendenze.
- [ ] Nessun ID eliminato deve essere riutilizzato creando un nuovo record.

## 24. Layout desktop, tablet e mobile

Ripetere tutte le route almeno alle larghezze **320, 375, 390, 768, 900, 1024, 1180 e 1440 px**, in tema chiaro e scuro. Eseguire almeno un giro su un telefono fisico.

- [ ] Nessuna pagina produce scorrimento orizzontale dell'intero documento.
- [ ] Sidebar desktop non copre il contenuto; navigazione mobile resta su una sola riga ed è scorrevole quando necessario.
- [ ] Logo, avatar admin e icone profilo/notifiche restano allineati e dentro lo schermo.
- [ ] Titoli, descrizioni, date, email e nomi lunghi non si sovrappongono.
- [ ] Tutti gli input, select, calendari, checkbox, upload file e pulsanti hanno uno stile coerente.
- [ ] Tabelle grandi, elenco disponibilità e grafici scorrono nel proprio contenitore.
- [ ] Modali, pannelli QR, dettagli e messaggi vuoti restano interamente accessibili.
- [ ] Con tastiera mobile aperta, il campo attivo e il pulsante di invio restano raggiungibili.
- [ ] Ruotare il telefono verticale/orizzontale: layout e stato del form non devono rompersi.
- [ ] Le immagini mantengono proporzioni corrette e non deformano card o dettagli.

## 25. Tastiera e accessibilità essenziale

- [ ] Percorrere ogni pagina con Tab/Shift+Tab: ordine logico, focus visibile e nessun controllo irraggiungibile.
- [ ] Attivare link, pulsanti, checkbox, menu e modali con Invio/Spazio.
- [ ] Ogni pulsante solo icona ha un nome accessibile comprensibile.
- [ ] Campi ed errori hanno etichette leggibili; i messaggi importanti vengono annunciati tramite ruoli appropriati.
- [ ] Verificare contrasto in entrambi i temi e zoom browser al 200%.
- [ ] Le immagini informative hanno testo alternativo; quelle decorative non generano annunci inutili.

## 26. Errori, rete e consistenza

- [ ] Disattivare temporaneamente il backend e compiere un'azione: deve apparire un errore recuperabile, senza dati finti.
- [ ] Riattivare il backend e usare Riprova o ripetere l'azione senza ricaricare tutta l'app.
- [ ] Simulare una connessione lenta: mostrare caricamento e impedire invii doppi.
- [ ] Ricaricare durante un form non inviato: nessun record incompleto deve essere creato.
- [ ] Aprire due schede e modificare lo stesso dato: dopo la risposta l'interfaccia deve mostrare lo stato effettivo del server.
- [ ] Nessun errore 500 deve esporre query, percorsi locali, stack trace, segreti o dettagli SQLite.
- [ ] URL inesistenti e ID non validi devono produrre una pagina o un messaggio controllato.
- [ ] Foto di profilo e allegati devono richiedere autenticazione e rispettare il proprietario/ruolo.

## 27. Verifica su build di produzione

- [ ] Eseguire suite backend, suite frontend, lint e build production; registrare codice di uscita e numero dei test.
- [ ] Servire la cartella `www` con il fallback Angular e proxy `/api` sullo stesso dominio HTTPS.
- [ ] Aprire direttamente una route annidata, per esempio `/admin/statistics`: non deve risultare 404 dal web server.
- [ ] Verificare login, refresh dopo reload e logout sull'origine HTTPS finale.
- [ ] Nel browser, il cookie refresh deve risultare Secure, HttpOnly, SameSite=Lax e limitato a `/api/v1/auth`.
- [ ] Verificare che non sia attivo un CORS aperto e che richieste cross-site al refresh/logout siano rifiutate.
- [ ] Verificare dominio, certificato TLS, proxy, percorso persistente del database, cartella upload e SMTP sull'host finale.
- [ ] Riavviare frontend e backend: account, prenotazioni, foto, segnalazioni, notifiche e impostazioni devono persistere.
- [ ] Eseguire backup e ripristino di prova su una copia, controllando integrità e migrazioni.

## 28. Verbale e criterio finale di accettazione

Per ogni anomalia registrare: codice della voce, account/ruolo, prerequisiti, azione, risultato ottenuto, risultato atteso, screenshot, risposta HTTP priva di token e gravità.

SlotLab può essere dichiarata pronta rispetto ai requisiti concordati quando:

- [ ] tutte le voci applicabili risultano superate su database di collaudo pulito;
- [ ] non esistono errori bloccanti, alti o regressioni aperte;
- [ ] gli eventuali limiti minori sono documentati e accettati;
- [ ] suite automatizzate, lint e build production terminano con codice 0;
- [ ] collaudo desktop e telefono fisico è completato in entrambi i temi;
- [ ] SMTP, HTTPS, proxy, persistenza e backup sono verificati nell'ambiente finale;
- [ ] un secondo giro dei flussi critici conferma autenticazione, prenotazione, cancellazione, check-in, segnalazione, notifica e amministrazione dopo un riavvio completo.

Il “100%” va inteso come superamento documentato di questa matrice e dei requisiti del progetto nell'ambiente supportato. Non equivale alla prova matematica dell'assenza di difetti su qualsiasi dispositivo o condizione futura.
