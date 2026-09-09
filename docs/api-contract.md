# SlotLab API Contract

## 1. Scopo

Questo documento definisce il contratto tra il frontend Ionic/Angular di SlotLab e il futuro backend. Descrive endpoint, dati scambiati, autorizzazioni, stati e regole applicative. Il contratto non dipende dal linguaggio o dal framework scelto per il backend.

Tutte le regole devono essere applicate dal server, anche quando il frontend effettua controlli preventivi. Il sistema riguarda esclusivamente il campus di Viale delle Scienze.

Il modello logico e le decisioni della revisione sono documentati in [relational-schema.md](relational-schema.md). Il presente documento è allineato alle decisioni approvate senza modificare la proposta già inviata. L'esito e i confini del consolidamento sono riepilogati alla fine del documento.

## 2. Convenzioni generali

### 2.1 URL e formato

- Frontend e backend sono pubblicati sullo stesso dominio.
- Tutti gli endpoint hanno il prefisso `/api/v1`.
- Richieste e risposte usano JSON, tranne il caricamento della fotografia.
- Le proprietà JSON usano `camelCase`.
- Nomi tecnici e stati sono in inglese; il frontend mostra le etichette italiane.
- Gli identificativi delle entità sono interi progressivi e non vengono riutilizzati.

Esempio di produzione:

```text
Frontend: https://slotlab.it
Backend:  https://slotlab.it/api/v1
```

### 2.2 Date e orari

- Data: `YYYY-MM-DD`.
- Orario di una fascia: `HH:mm`.
- Timestamp completo: ISO 8601.
- I timestamp sono registrati in UTC.
- Le regole temporali sono interpretate nel fuso `Europe/Rome`.

```json
{
  "date": "2026-09-10",
  "startTime": "10:00",
  "endTime": "12:00",
  "createdAt": "2026-09-04T16:30:00Z"
}
```

### 2.3 Risposta corretta

```json
{
  "data": {
    "id": 12,
    "name": "Aula Studio A1"
  }
}
```

Gli elenchi paginati contengono anche:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "size": 20,
    "totalElements": 0,
    "totalPages": 0
  }
}
```

### 2.4 Risposta di errore

```json
{
  "error": {
    "code": "SPACE_NOT_FOUND",
    "message": "Lo spazio richiesto non esiste."
  }
}
```

Quando necessario viene aggiunto `details`:

```json
{
  "error": {
    "code": "INSUFFICIENT_CAPACITY",
    "message": "I posti disponibili non sono sufficienti.",
    "details": {
      "requestedSeats": 3,
      "availableSeats": 1
    }
  }
}
```

### 2.5 Paginazione

Gli elenchi di spazi, prenotazioni, notifiche, segnalazioni e utenti sono paginati con `page` e `size`.

- La prima pagina è `1`.
- La dimensione predefinita è 20.
- La dimensione massima è 100.
- I piccoli elenchi predefiniti non sono paginati.

### 2.6 Codici HTTP

| Codice | Utilizzo |
|---:|---|
| `200 OK` | Lettura o modifica completata |
| `201 Created` | Nuova risorsa creata |
| `204 No Content` | Operazione completata senza corpo |
| `400 Bad Request` | Dati mancanti o non validi |
| `401 Unauthorized` | Autenticazione assente, scaduta o non valida |
| `403 Forbidden` | Autorizzazione insufficiente |
| `404 Not Found` | Risorsa inesistente |
| `409 Conflict` | Violazione di una regola applicativa |
| `413 Payload Too Large` | Fotografia superiore a 5 MB oppure corpo JSON oltre il limite tecnico |
| `415 Unsupported Media Type` | Formato del file non ammesso |
| `429 Too Many Requests` | Troppe richieste |
| `500 Internal Server Error` | Errore inatteso del server |

## 3. Autenticazione e autorizzazione

### 3.1 Ruoli

```text
user
admin
```

- Un visitatore non autenticato usa soltanto registrazione, login, rinnovo e recupero password.
- `user` usa ricerca, prenotazione, check-in, preferiti e segnalazioni.
- `admin` usa esclusivamente le funzioni amministrative.
- Gli amministratori vengono creati soltanto da chi gestisce tecnicamente il sistema.
- Il backend controlla il ruolo per ogni richiesta protetta.

### 3.2 Access token JWT

L'access token dura 30 minuti ed è inviato così:

```http
Authorization: Bearer ACCESS_TOKEN
```

Contiene soltanto:

```json
{
  "sub": "15",
  "role": "user",
  "iat": 1788523200,
  "exp": 1788525000,
  "jti": "identificativo-univoco-del-token"
}
```

### 3.3 Refresh token

- Dura 7 giorni.
- È conservato in un cookie `HttpOnly`, `Secure`, `SameSite=Lax`, con `Path=/api/v1/auth`.
- Il backend conserva soltanto l'hash.
- A ogni rinnovo il precedente viene invalidato e sostituito.
- Ogni account può avere una sola sessione attiva.
- Un nuovo login invalida la sessione precedente.

La tabella tecnica `auth_sessions` conserva al massimo una sessione per account. Ogni richiesta protetta richiede sia un JWT valido sia la corrispondenza del suo `jti` con quello della sessione corrente. Il rinnovo sostituisce insieme hash del refresh token e `jti` dell'access token: anche il precedente access token diventa immediatamente inutilizzabile. L'invalidazione non dipende soltanto dalla scadenza del JWT.

### 3.4 Registrazione

#### `POST /auth/register`

Accesso: pubblico.

```json
{
  "firstName": "Francesco",
  "lastName": "Genova",
  "email": "frank.fgk@gmail.com",
  "password": "Slotlab2026!"
}
```

Regole:

- email univoca, privata degli spazi esterni e convertita in minuscolo;
- attivazione immediata senza verifica email;
- ruolo assegnato sempre `user`; il campo `role` non è accettato;
- password da 8 a 64 caratteri, con maiuscola, minuscola, numero e carattere speciale;
- nessuno spazio ammesso nella password;
- viene conservato soltanto l'hash;
- dopo la registrazione l'utente effettua il login.

Risposta `201 Created`:

```json
{
  "data": {
    "id": 15,
    "firstName": "Francesco",
    "lastName": "Genova",
    "email": "frank.fgk@gmail.com",
    "role": "user",
    "createdAt": "2026-09-04T16:30:00Z"
  }
}
```

Errori: `EMAIL_ALREADY_EXISTS`, `INVALID_EMAIL`, `INVALID_PASSWORD_FORMAT`, `VALIDATION_ERROR`.

### 3.5 Login

#### `POST /auth/login`

Accesso: pubblico.

```json
{
  "email": "frank.fgk@gmail.com",
  "password": "Slotlab2026!"
}
```

Risposta `200 OK`:

```json
{
  "data": {
    "accessToken": "ACCESS_TOKEN",
    "tokenType": "Bearer",
    "expiresIn": 1800,
    "user": {
      "id": 15,
      "firstName": "Francesco",
      "lastName": "Genova",
      "email": "frank.fgk@gmail.com",
      "role": "user"
    }
  }
}
```

La risposta imposta il cookie del refresh token e invalida l'eventuale sessione precedente. Errore: `INVALID_CREDENTIALS` con `401`.

### 3.6 Rinnovo

#### `POST /auth/refresh`

Accesso: cookie del refresh token richiesto. Il token non compare nel JSON.

Il client invia l'header `X-SlotLab-Request: 1`; le richieste prive dell'header o dichiarate cross-site sono rifiutate con `403 FORBIDDEN`. Non abilitare CORS verso origini arbitrarie per questo endpoint. Il cookie e `slotlab_refresh`, con le opzioni del paragrafo 3.3.

```json
{
  "data": {
    "accessToken": "NEW_ACCESS_TOKEN",
    "tokenType": "Bearer",
    "expiresIn": 1800
  }
}
```

La risposta ruota il refresh token. Errori: `REFRESH_TOKEN_MISSING`, `REFRESH_TOKEN_INVALID`, `REFRESH_TOKEN_EXPIRED`, `SESSION_REPLACED`.

Ogni nuovo refresh dura 7 giorni dalla rotazione; `created_at` della sessione conserva il momento del login. Il vecchio access token viene invalidato sostituendo il suo jti insieme all'hash del refresh. I quattro errori sopra hanno stato 401. Un hash non piu presente e indistinguibile da uno sconosciuto e restituisce `REFRESH_TOKEN_INVALID`; `SESSION_REPLACED` indica una sostituzione rilevata tra lettura e aggiornamento della sessione. Una richiesta rifiutata non cancella il cookie, per non sovrascrivere quello di un rinnovo concorrente riuscito.

### 3.7 Logout

#### `POST /auth/logout`

Elimina la sessione corrente, invalidando sia access token sia refresh token, elimina il cookie e restituisce `204 No Content`.

La sessione e identificata dal cookie `slotlab_refresh`; non e necessario un access token ancora valido. Come il refresh, richiede `X-SlotLab-Request: 1` e rifiuta richieste cross-site (`403 FORBIDDEN`). Il DELETE usa soltanto l'hash del cookie ricevuto, mai un ID account fornito dal client. Il logout e idempotente: cookie assente, malformato o non piu corrente restituisce comunque 204, senza modificare altre sessioni. Il cookie viene fatto scadere soltanto quando e stata eliminata la sessione corrispondente, evitando che una richiesta vecchia cancelli il cookie di un login/rinnovo successivo. Un errore DB restituisce 500 e non cancella il cookie.

### 3.8 Password dimenticata

#### `POST /auth/forgot-password`

Accesso: pubblico.

```json
{
  "email": "frank.fgk@gmail.com"
}
```

Il sistema genera una nuova password, conserva soltanto l'hash e la invia via email. Il cambio al primo accesso non è obbligatorio. Tutti i token precedenti vengono invalidati. Per non rivelare l'esistenza dell'account, la risposta è sempre `204 No Content` se il formato dell'email è valido.

## 4. Profilo

### `GET /users/me`

Accesso: `user` o `admin`. Restituisce ID, nome, cognome, email, ruolo e data di creazione.

### `PATCH /users/me/password`

```json
{
  "currentPassword": "Slotlab2026!",
  "newPassword": "NuovaPassword2026!"
}
```

Verifica la password corrente e le regole della nuova password. Invalida tutti i token, elimina il cookie e richiede un nuovo login. Risposta: `204 No Content`.

Errori: `CURRENT_PASSWORD_INVALID`, `INVALID_PASSWORD_FORMAT`.

### Foto profilo

- `GET /users/me/photo`: restituisce la foto del proprio profilo oppure `404 PROFILE_PHOTO_NOT_FOUND`.
- `PUT /users/me/photo`: sostituisce la foto usando il corpo binario della richiesta. Accetta JPEG, PNG o WebP fino a 2 MB e verifica che il contenuto corrisponda al formato dichiarato nell'header `Content-Type`. Risposta: `204 No Content`.
- `DELETE /users/me/photo`: rimuove la foto e ripristina le iniziali. Risposta: `204 No Content`.

Tutti e tre gli endpoint richiedono un account autenticato `user` o `admin`. Errori di caricamento: `INVALID_PROFILE_PHOTO_FORMAT`, `PROFILE_PHOTO_TOO_LARGE`, `EMPTY_PROFILE_PHOTO`.

### `DELETE /users/me`

```json
{
  "currentPassword": "Slotlab2026!"
}
```

La password corrente è obbligatoria. La cancellazione è definitiva, invalida la sessione e applica le eliminazioni a cascata. Risposta: `204 No Content`.

## 5. Edifici e spazi

### 5.1 Edificio

```json
{
  "id": 4,
  "number": 8,
  "name": "Edificio 8",
  "address": "Viale delle Scienze, Palermo",
  "latitude": 38.1045,
  "longitude": 13.3482
}
```

`id` è tecnico; `number` è la numerazione ufficiale Unipa usata per ricerca, ordinamento e visualizzazione.

### `GET /buildings`

Accesso: `user`. Restituisce gli edifici per numero ufficiale crescente, senza paginazione.

### `GET /buildings/{buildingId}`

Accesso: `user`.

### `GET /buildings/{buildingId}/spaces?page=1&size=20`

Accesso: `user`. È usato quando viene selezionato il marker di un edificio. Un edificio senza spazi restituisce un elenco vuoto.

### 5.2 Spazio

```json
{
  "id": 12,
  "name": "Aula Studio A1",
  "building": {
    "id": 4,
    "number": 8,
    "name": "Edificio 8"
  },
  "floor": 2,
  "type": "study_room",
  "capacity": 24,
  "accessible": true,
  "status": "active",
  "services": ["wifi", "power_outlets", "projector"],
  "imageType": "study_room"
}
```

Tipologie:

```text
study_room
laboratory
meeting_room
```

Stati:

```text
active
maintenance
deactivated
```

Servizi predefiniti:

```text
wifi
power_outlets
projector
computer
air_conditioning
```

I servizi descrivono lo spazio, ma non sono prenotabili. Gli spazi in manutenzione o disattivati restano visibili ma non sono prenotabili.

### `GET /spaces`

Accesso: `user`.

| Parametro | Tipo | Descrizione |
|---|---|---|
| `search` | stringa | Nome dello spazio oppure nome o numero dell'edificio |
| `availableNow` | booleano | Presenza di una fascia futura prenotabile entro 30 giorni |
| `accessible` | booleano | Accessibilità fisica dello spazio |
| `minSeats` | intero | Soglia minima di posti liberi, applicata secondo le combinazioni descritte sotto |
| `page` | intero | Pagina richiesta |
| `size` | intero | Elementi per pagina |

Non sono previsti altri filtri per l'utente.

Il filtro visualizzato «Disponibili ora» invia `availableNow=true`. Non indica una fascia già in corso: per ciascuno spazio cerca la prima fascia futura effettivamente prenotabile, in ordine cronologico ed entro 30 giorni, escludendo fasce iniziate, piene, indisponibili o oltre il limite di un'ora prima dell'inizio.

Il filtro visualizzato «Posti ≥ 10» invia `minSeats=10`. Usato senza `availableNow=true`, confronta la soglia con i posti liberi della prima fascia prenotabile dello spazio, senza usare la capienza totale e senza passare a una fascia successiva soltanto per raggiungere la soglia.

Quando `availableNow=true` e `minSeats` sono presenti insieme, si cerca invece la prima fascia cronologica che è prenotabile e raggiunge la soglia. Una fascia precedente con meno posti viene saltata. Esempio approvato: alle 10:30, con 12:00–14:00 prenotabile e otto posti liberi e 14:00–16:00 prenotabile e quindici posti liberi, `availableNow=true&minSeats=10` include lo spazio facendo riferimento alla fascia 14:00–16:00. Uno spazio senza una fascia conforme entro 30 giorni è escluso.

```text
GET /spaces?search=Aula&availableNow=true&accessible=true&minSeats=10&page=1&size=20
```

### `GET /spaces/recommended`

Accesso: `user`. Restituisce al massimo tre spazi `active`, dando priorità al giorno attuale nel fuso `Europe/Rome`.

Per ciascuno spazio si individua la prima fascia ancora prenotabile oggi: non piena, non indisponibile e rispettosa dell'anticipo minimo di un'ora. Si ordinano gli spazi per posti liberi decrescenti in quella fascia e, a parità, per nome. Ogni spazio compare una sola volta.

Se almeno uno spazio è prenotabile oggi, si mostrano soltanto risultati di oggi, anche se sono meno di tre. Soltanto quando non esiste alcun risultato per oggi si applica lo stesso criterio a domani, senza mescolare le due giornate. L'esempio delle 22:00 non introduce una soglia fissa. Il limite generale di 30 giorni per prenotare non diventa l'orizzonte di ricerca dei consigli.

### `GET /spaces/{spaceId}`

Accesso: `user`. Restituisce anche servizi, stato e indicazione se è preferito dall'utente.

### `GET /spaces/{spaceId}/availability?date=2026-09-10`

Accesso: `user`.

```json
{
  "data": [
    {
      "availabilityId": 34,
      "date": "2026-09-10",
      "startTime": "10:00",
      "endTime": "12:00",
      "availableSeats": 18,
      "bookable": true,
      "reason": null
    }
  ]
}
```

Quando non è prenotabile, `bookable` è `false` e `reason` vale `SPACE_UNAVAILABLE`, `SLOT_UNAVAILABLE` o `BOOKING_DEADLINE_EXPIRED`.

## 6. Prenotazioni e partecipanti

### 6.1 Regole

- Ogni posto corrisponde a un account registrato.
- L'organizzatore occupa il primo posto.
- I partecipanti sono aggiunti tramite email completa, immediatamente e senza accettazione.
- Un utente non può partecipare a prenotazioni sovrapposte.
- Ogni utente può avere al massimo cinque prenotazioni future attive, come organizzatore o partecipante.
- Si può prenotare soltanto nei successivi 30 giorni.
- Creazione, cancellazione e gestione partecipanti si bloccano un'ora prima dell'inizio.
- Si possono prenotare fasce consecutive come prenotazioni distinte.
- Non esistono coda o lista d'attesa.
- Non si prenotano attrezzature.
- Una prenotazione cancellata viene eliminata.
- Una prenotazione terminata diventa `completed`, scompare per l'utente e resta nello storico amministrativo.

Stati:

```text
confirmed
completed
```

### `GET /bookings?page=1&size=20`

Accesso: `user`. Restituisce le prenotazioni future o in corso in cui l'utente è organizzatore o partecipante, dalla più vicina.

### `GET /bookings/{bookingId}`

Accesso: utente coinvolto. Restituisce spazio, fascia, organizzatore, partecipanti e presenze.

### `POST /bookings`

Accesso: `user`.

Intestazione obbligatoria:

```http
Idempotency-Key: 8f28a643-9d8e-4c5d-a460-0c589c53f289
```

```json
{
  "spaceId": 12,
  "date": "2026-09-10",
  "availabilityId": 34,
  "participantEmails": [
    "studente1@example.com",
    "studente2@example.com"
  ]
}
```

La chiave identifica la richiesta per l'account autenticato. Due richieste con la stessa chiave e gli stessi dati producono una sola prenotazione; riutilizzare la chiave con dati diversi restituisce `409 Conflict` (`CONFLICT`). Il server verifica atomicamente disponibilità, stato, capienza, sovrapposizioni, partecipanti, limite, periodo e anticipo minimo.

La creazione della prenotazione e della registrazione in `booking_requests` avviene nella stessa transazione. Se la creazione fallisce non rimane una registrazione di successo. Se la prenotazione viene successivamente eliminata, la chiave rimane con `booking_id = NULL`: ripetere quella richiesta restituisce `409 Conflict` e non ricrea la prenotazione. Una nuova prenotazione intenzionale richiede una nuova chiave. La cancellazione dell'account elimina le sue registrazioni tecniche.

Se due richieste concorrenti richiedono gli ultimi posti, viene accettata quella elaborata per prima. L'altra riceve `409` con `INSUFFICIENT_CAPACITY`.

Risposta: `201 Created`. Errori: `SPACE_NOT_AVAILABLE`, `SLOT_NOT_AVAILABLE`, `PARTICIPANT_NOT_FOUND`, `DUPLICATE_PARTICIPANT`, `INSUFFICIENT_CAPACITY`, `BOOKING_OVERLAP`, `BOOKING_LIMIT_REACHED`, `BOOKING_DATE_OUT_OF_RANGE`, `BOOKING_DEADLINE_EXPIRED`.

### `POST /bookings/{bookingId}/participants`

Accesso: organizzatore.

```json
{
  "email": "studente@example.com"
}
```

Risposta: `201 Created`.

### `DELETE /bookings/{bookingId}/participants/{participantId}`

- L'organizzatore può rimuovere un altro partecipante.
- Un partecipante può rimuovere soltanto se stesso.
- L'organizzatore non può rimuovere se stesso senza cancellare la prenotazione.
- L'operazione è permessa fino a un'ora prima e restituisce `204`.

### `DELETE /bookings/{bookingId}`

Accesso: organizzatore. È permessa fino a un'ora prima. Elimina prenotazione, partecipazioni e presenze, libera i posti e notifica gli altri partecipanti. Risposta: `204`.

## 7. Check-in e presenze

Ogni spazio possiede un QR Code permanente contenente direttamente il suo ID:

```text
https://slotlab.it/check-in/12
```

Se l'utente non è autenticato, il frontend conserva la destinazione, mostra il login e poi torna alla verifica.

### `POST /spaces/{spaceId}/check-in`

Accesso: `user`.

Il server individua la partecipazione dell'utente per spazio e fascia. Il check-in è consentito da 15 minuti prima a 30 minuti dopo l'inizio.

```json
{
  "data": {
    "result": "check_in_accepted",
    "message": "Accesso consentito.",
    "bookingId": 48,
    "spaceId": 12,
    "checkedInAt": "2026-09-10T08:52:00Z"
  }
}
```

Un tentativo ripetuto restituisce `200` con `already_checked_in`, senza cambiare il primo orario. Errori: `NO_BOOKING_FOR_SPACE`, `CHECK_IN_TOO_EARLY`, `CHECK_IN_EXPIRED`, `SPACE_NOT_FOUND`.

La partecipazione nasce con `present: false` e `checkedInAt: null`. Il check-in valido imposta la presenza a `true`. Dopo il limite, `false` rappresenta un'assenza.

## 8. Preferiti

### `GET /favorites?page=1&size=20`

Restituisce gli spazi preferiti con stato aggiornato. Qualsiasi spazio può essere preferito anche se pieno, in manutenzione o disattivato.

### `POST /favorites/{spaceId}`

Prima aggiunta: `201 Created`. Se già presente: `200 OK`, senza duplicati.

### `DELETE /favorites/{spaceId}`

Risposta: `204 No Content` anche quando il preferito è già assente.

## 9. Segnalazioni

Categorie e priorità automatiche:

| Categoria | Priorità |
|---|---|
| `technical` | `high` |
| `accessibility` | `high` |
| `cleaning` | `medium` |
| `other` | `low` |

Stati:

```text
open
in_progress
resolved
```

Una segnalazione risolta non può essere riaperta. L'utente non può modificarla o eliminarla dopo l'invio.

### `GET /reports?page=1&size=20`

Restituisce soltanto le segnalazioni dell'utente, dalla più recente.

### `GET /reports/{reportId}`

Accesso: autore della segnalazione.

### `POST /spaces/{spaceId}/reports`

Tipo: `multipart/form-data`.

| Campo | Obbligatorio | Descrizione |
|---|---|---|
| `category` | sì | Categoria predefinita |
| `description` | sì | Descrizione del problema |
| `photo` | no | Una JPEG, PNG o WebP, massimo 5 MB |

Il server verifica il contenuto del file, genera il nome e assegna priorità e stato `open`. Risposta: `201`. Errori: `INVALID_REPORT_CATEGORY`, `INVALID_PHOTO_FORMAT`, `PHOTO_TOO_LARGE`.

## 10. Notifiche e avvisi

Le notifiche sono interne, non possono essere disabilitate o eliminate manualmente. Tipi indicativi:

```text
booking_created
booking_updated
booking_cancelled
participant_added
participant_removed
space_unavailable
check_in_reminder
check_in_expired
report_updated
global_announcement
```

### `GET /notifications?page=1&size=20`

Restituisce le notifiche dalla più recente.

### `PATCH /notifications/{notificationId}/read`

Accesso: proprietario. Richieste ripetute non cambiano la prima data di lettura. Risposta: `200`.

### `PATCH /notifications/read-all`

Segna tutte le notifiche non lette. Risposta: `204`.

Un avviso globale genera una notifica per ogni account `user` esistente al momento della pubblicazione. Ogni destinatario ha il proprio stato di lettura. Gli amministratori e gli utenti registrati successivamente non ricevono l'avviso.

## 11. Amministrazione

Tutti gli endpoint richiedono `admin`.

### 11.1 Edifici

```text
GET    /admin/buildings
POST   /admin/buildings
GET    /admin/buildings/{buildingId}
PATCH  /admin/buildings/{buildingId}
DELETE /admin/buildings/{buildingId}
```

Numero ufficiale, nome, indirizzo e coordinate sono gestiti dall'amministratore. Il numero ufficiale è univoco nel campus.

### 11.2 Spazi

```text
GET    /admin/spaces?page=1&size=20
POST   /admin/spaces
GET    /admin/spaces/{spaceId}
PATCH  /admin/spaces/{spaceId}
DELETE /admin/spaces/{spaceId}
```

Gestisce nome, edificio, piano, tipologia, capienza, accessibilità, servizi e stato. Tipologie e servizi devono essere predefiniti. Il passaggio da `active` a `maintenance` o `deactivated` elimina le prenotazioni future e notifica gli utenti.

Una riduzione di capienza viene rifiutata con `409 Conflict` se il nuovo valore è inferiore ai posti già prenotati in almeno un intervallo futuro o in corso. Il controllo comprende le prenotazioni riferite a configurazioni ritirate e non considera quelle completate. L'errore identifica l'intervallo incompatibile.

Per una riduzione necessaria l'amministratore usa gli strumenti esistenti: rende indisponibili le fasce future interessate, con cancellazione e notifica, poi riduce la capienza ed eventualmente rimuove l'indisponibilità. Non esiste una forzatura né una scelta automatica dei gruppi da eliminare. Se l'incompatibilità riguarda una fascia già in corso, la riduzione resta bloccata fino al termine della fascia.

### 11.3 Fasce di disponibilità

```text
GET    /admin/spaces/{spaceId}/availability
POST   /admin/spaces/{spaceId}/availability
PATCH  /admin/spaces/{spaceId}/availability/{availabilityId}
DELETE /admin/spaces/{spaceId}/availability/{availabilityId}
```

Una fascia contiene giorno della settimana, ora iniziale, ora finale e periodo di validità. Le fasce sono predefinite ma possono variare per spazio e periodo. Una modifica che invalida prenotazioni future le elimina e notifica gli utenti.

Il periodo comprende le date iniziale e finale; `weekday` va da 1 (lunedì) a 7 (domenica). La fine della fascia deve essere successiva all'inizio nella stessa giornata. Due configurazioni non ritirate dello stesso spazio non possono generare fasce duplicate o sovrapposte in una data effettiva comune. Fasce consecutive sono consentite. Le violazioni restituiscono `409 Conflict`.

Le configurazioni necessarie alle prenotazioni esistenti non vengono sovrascritte o eliminate fisicamente: la vecchia riga viene conservata con `is_retired = true` e, in caso di sostituzione, si crea una nuova riga. La configurazione ritirata non è offerta per nuove prenotazioni. Quelle storiche e quelle future non invalidate mantengono spazio, data e orari originali. La cancellazione definitiva dello spazio o dell'edificio continua invece a eliminare anche queste configurazioni e le prenotazioni collegate.

### 11.4 Indisponibilità eccezionali

```text
GET    /admin/spaces/{spaceId}/unavailability
POST   /admin/spaces/{spaceId}/unavailability
PATCH  /admin/spaces/{spaceId}/unavailability/{unavailabilityId}
DELETE /admin/spaces/{spaceId}/unavailability/{unavailabilityId}
```

Contengono data, ora iniziale, ora finale e motivazione amministrativa. La creazione elimina le prenotazioni future interessate e notifica gli utenti.

### 11.5 Prenotazioni

```text
GET    /admin/bookings?page=1&size=20
GET    /admin/bookings/{bookingId}
DELETE /admin/bookings/{bookingId}
```

Parametri: `search`, `status`, `dateFrom`, `dateTo`, `page`, `size`.

L'amministratore consulta prenotazioni future e completate, partecipanti, presenze e assenze. Può eliminare una prenotazione soltanto per indisponibilità dello spazio. Non può crearla, spostarla o modificarne i partecipanti.

### 11.6 Utenti

```text
GET    /admin/users?page=1&size=20
GET    /admin/users/{userId}
DELETE /admin/users/{userId}
```

La ricerca accetta nome, cognome o email. L'amministratore può consultare prenotazioni e presenze ed eliminare definitivamente un account normale. Non può bloccarlo, modificarne i dati, cambiarne la password o eliminare un amministratore.

### 11.7 Segnalazioni

```text
GET   /admin/reports?page=1&size=20
GET   /admin/reports/{reportId}
PATCH /admin/reports/{reportId}/status
```

Le segnalazioni sono condivise. Non esistono assegnatario, commenti o risposte testuali.

```json
{
  "status": "in_progress"
}
```

Transizioni:

```text
open -> in_progress
open -> resolved
in_progress -> resolved
```

Da `resolved` non sono consentite transizioni.

### 11.8 Avvisi globali

#### `POST /admin/announcements`

```json
{
  "title": "Chiusura edificio 8",
  "message": "L'edificio resterà chiuso nel pomeriggio."
}
```

Risposta: `201 Created`, con `{ data: { id, title, message, createdAt, recipientCount } }`. Titolo e messaggio sono stringhe obbligatorie non vuote dopo il trim. La pubblicazione salva atomicamente una notifica per ogni account `user` esistente, escludendo amministratori e iscrizioni successive.

### 11.9 Statistiche

#### `GET /admin/statistics?dateFrom=2026-09-01&dateTo=2026-09-30`

Le date sono obbligatorie. Restituisce prenotazioni completate, partecipanti, presenze, assenze, spazi più prenotati, fasce più usate, occupazione media e segnalazioni per categoria e stato.

Significato approvato degli indicatori del mockup:

| Indicatore | Calcolo |
|---|---|
| Prenotazioni | Numero di prenotazioni completate, contando una prenotazione di gruppo una sola volta |
| Tasso di utilizzo / occupazione media | Somma delle presenze tramite check-in / somma dei posti offerti nelle fasce considerate × 100 |
| Check-in completati | Somma delle presenze / somma dei partecipanti prenotati nelle fasce considerate × 100 |

Per utilizzo e presenze si considerano soltanto le fasce già terminate nel periodo selezionato. I posti offerti comprendono anche le fasce senza prenotazioni, ma non quelle rese indisponibili. Le fasce future o in corso sono escluse. Il denominatore dei check-in è il numero dei partecipanti prenotati, non quello dei gruppi. Il tasso di utilizzo è un rapporto tra totali, non una media semplice delle percentuali per fascia.

Esempio: un'aula da 20 posti con due fasce terminate offre complessivamente 40 posti. Dieci presenze nella prima fascia e nessuna nella seconda producono il 25% di utilizzo. La presenza registrata tramite check-in non misura in modo continuo le persone fisicamente in aula.

Le formule e la conservazione dei dati storici sono approvate. Il modello relazionale materializza ogni fascia concreta in `slot_occurrences`, comprese quelle senza prenotazioni, e consolida all'inizio della fascia la capienza effettivamente offerta e l'eventuale esclusione per indisponibilità. Le modifiche amministrative successive non ricalcolano questi valori.

Il tasso di utilizzo usa soltanto occorrenze terminate e contrassegnate come effettivamente offerte; la loro `offered_capacity` costituisce il denominatore. Le occorrenze rese indisponibili non contribuiscono. L'eliminazione definitiva dello spazio o dell'edificio elimina anche questi dati tecnici, quindi gli indicatori non promettono uno storico immutabile dopo le cancellazioni già concordate.

## 12. Dati predefiniti

```text
GET /metadata/space-types
GET /metadata/services
GET /metadata/report-categories
```

Accesso: `user` o `admin`. Evitano differenze tra le etichette tecniche di frontend e backend.

## 13. Errori applicativi

### Autenticazione e account

```text
INVALID_CREDENTIALS
EMAIL_ALREADY_EXISTS
INVALID_EMAIL
INVALID_PASSWORD_FORMAT
CURRENT_PASSWORD_INVALID
REFRESH_TOKEN_MISSING
REFRESH_TOKEN_INVALID
REFRESH_TOKEN_EXPIRED
SESSION_REPLACED
USER_NOT_FOUND
```

### Edifici e spazi

```text
BUILDING_NOT_FOUND
BUILDING_NUMBER_ALREADY_EXISTS
SPACE_NOT_FOUND
SPACE_NOT_AVAILABLE
INVALID_SPACE_TYPE
INVALID_SERVICE
SLOT_NOT_AVAILABLE
```

### Prenotazioni e check-in

```text
BOOKING_NOT_FOUND
BOOKING_OVERLAP
BOOKING_LIMIT_REACHED
BOOKING_DATE_OUT_OF_RANGE
BOOKING_DEADLINE_EXPIRED
INSUFFICIENT_CAPACITY
PARTICIPANT_NOT_FOUND
DUPLICATE_PARTICIPANT
ORGANIZER_CANNOT_LEAVE
NO_BOOKING_FOR_SPACE
CHECK_IN_TOO_EARLY
CHECK_IN_EXPIRED
```

### Segnalazioni e notifiche

```text
REPORT_NOT_FOUND
INVALID_REPORT_CATEGORY
INVALID_REPORT_STATUS_TRANSITION
INVALID_PHOTO_FORMAT
PHOTO_TOO_LARGE
NOTIFICATION_NOT_FOUND
```

### Generali

```text
VALIDATION_ERROR
INVALID_JSON
PAYLOAD_TOO_LARGE
ROUTE_NOT_FOUND
UNAUTHORIZED
FORBIDDEN
RESOURCE_NOT_FOUND
CONFLICT
RATE_LIMIT_EXCEEDED
INTERNAL_ERROR
```

## 14. Cancellazioni e transazioni

Le operazioni che modificano prenotazioni, posti, partecipazioni, presenze e notifiche sono atomiche.

### Prenotazione

- Elimina prenotazione, partecipazioni e presenze.
- Restituisce i posti alla fascia.
- Notifica gli altri utenti coinvolti.
- Mantiene le registrazioni `booking_requests` degli account esistenti con `booking_id = NULL`, per impedire che un vecchio invio ricrei la prenotazione.

### Account

- Elimina prenotazioni organizzate, partecipazioni, presenze, preferiti, segnalazioni, fotografie e notifiche.
- Notifica gli altri partecipanti delle prenotazioni future eliminate.
- Non conserva uno storico riconducibile all'account.
- Elimina anche `auth_sessions` e `booking_requests` dell'account.

Le prenotazioni organizzate dall'account vengono individuate ed eliminate prima delle sue partecipazioni: la sola cascata sulle partecipazioni lascerebbe prenotazioni senza organizzatore. Nelle prenotazioni organizzate da altri si rimuove soltanto la partecipazione dell'account eliminato. La regola vale anche per lo storico.

### Spazio

- Elimina disponibilità, indisponibilità, preferiti, segnalazioni e fotografie.
- Elimina prenotazioni future e completate.
- Notifica gli utenti delle prenotazioni future.
- Elimina i collegamenti `space_services`, ma non il catalogo predefinito dei servizi. Le disponibilità eliminate comprendono quelle ritirate.

### Edificio

- Elimina tutti gli spazi contenuti.
- Per ogni spazio applica la relativa cancellazione a cascata.

Se una parte dell'operazione sul database fallisce, l'intera transazione viene annullata; anche le notifiche da generare sono inserite nella stessa transazione. La rimozione delle fotografie richiede invece un coordinamento con il filesystem: il rollback del database non ripristina automaticamente un file eliminato. Questo dettaglio sarà attuato nella fase backend senza promettere atomicità tra database e filesystem.

## 15. Ordinamenti predefiniti

| Risorsa | Ordinamento |
|---|---|
| Edifici | Numero ufficiale crescente |
| Spazi | Nome crescente |
| Prenotazioni future | Data e ora crescenti |
| Prenotazioni completate amministrative | Data e ora decrescenti |
| Notifiche | Creazione decrescente |
| Segnalazioni | Creazione decrescente |
| Utenti amministrativi | Cognome e nome crescenti |
| Spazi consigliati | Posti disponibili decrescenti, poi nome crescente |

Ordinamento esplicito, quando supportato:

```text
?sort=createdAt,desc
```

## 16. Schermate ed endpoint

| Schermata | Endpoint principali |
|---|---|
| Registrazione | `POST /auth/register` |
| Login | `POST /auth/login`, `POST /auth/refresh` |
| Password dimenticata | `POST /auth/forgot-password` |
| Home | `GET /spaces/recommended`, `GET /buildings`, `GET /bookings` |
| Spazi | `GET /spaces`, `GET /buildings/{id}/spaces` |
| Dettaglio spazio | `GET /spaces/{id}`, `GET /spaces/{id}/availability` |
| Nuova prenotazione | `POST /bookings` |
| Prenotazioni | `GET /bookings`, `GET` e `DELETE /bookings/{id}` |
| Preferiti | `GET /favorites`, `POST` e `DELETE /favorites/{id}` |
| Check-in | `POST /spaces/{id}/check-in` |
| Segnalazioni | `POST /spaces/{id}/reports`, `GET /reports` |
| Notifiche | `GET /notifications`, endpoint di lettura |
| Profilo | `GET /users/me`, modifica password, eliminazione account |
| Amministrazione | Endpoint sotto `/admin` |

## 17. Sicurezza del backend

- Controllare autenticazione e ruolo sul server.
- Non fidarsi di ID utente, ruolo, capienza o disponibilità inviati dal frontend.
- Non restituire password o hash.
- Usare un algoritmo sicuro per l'hashing delle password.
- Applicare rate limiting almeno a login, recupero password, refresh e check-in.
- Validare tipo e dimensione delle fotografie.
- Controllare la proprietà delle risorse richieste.
- Usare transazioni per concorrenza e cancellazioni a cascata.
- Generare sul server i timestamp sensibili.
- Confrontare le email dopo la normalizzazione.

## 18. Confini del contratto

Il documento non sceglie ancora:

- linguaggio e framework del backend;
- DBMS;
- struttura fisica delle tabelle;
- servizio concreto per l'invio delle email;
- infrastruttura di distribuzione;
- implementazione grafica.

Queste scelte non devono modificare i comportamenti e i dati stabiliti nel contratto.

## 19. Esito del consolidamento

Sono stati riportati i chiarimenti approvati su sessione unica, comportamento singolo e combinato dei filtri, consigli limitati prima a oggi e poi a domani, protezione dai doppi invii, conservazione delle configurazioni referenziate, riduzione della capienza, cancellazioni, significato delle statistiche e conservazione dei posti effettivamente offerti nei periodi passati.

La ricostruzione dei posti offerti storici è risolta tramite le occorrenze consolidate definite nello schema relazionale. Il coordinamento dei filtri `availableNow` e `minSeats` è definito nella sezione Spazi. Le questioni funzionali emerse dal confronto sono risolte. Il contratto rimane indipendente dalla tecnologia; la sua traduzione SQLite e la base Express realizzate nel punto 2 sono documentate in [`backend/db/`](../backend/db/) e [`backend/README.md`](../backend/README.md).
