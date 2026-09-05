-- Edifici del campus. L'id tecnico e il numero ufficiale UniPa sono distinti.
CREATE TABLE buildings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number INTEGER NOT NULL UNIQUE CHECK (number > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  address TEXT NOT NULL CHECK (length(trim(address)) > 0),
  latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180)
);

-- Spazi prenotabili o visibili nel campus.
CREATE TABLE spaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_id INTEGER NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  floor INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (
    type IN ('study_room', 'laboratory', 'meeting_room')
  ),
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  accessible INTEGER NOT NULL CHECK (accessible IN (0, 1)),
  status TEXT NOT NULL CHECK (
    status IN ('active', 'maintenance', 'deactivated')
  ),
  FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
);

-- Catalogo fisso dei servizi disponibili negli spazi.
CREATE TABLE services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE CHECK (
    code IN (
      'wifi',
      'power_outlets',
      'projector',
      'computer',
      'air_conditioning'
    )
  ),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0)
);

-- Relazione molti-a-molti tra spazi e servizi.
CREATE TABLE space_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  UNIQUE (space_id, service_id),
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT
);

-- Fasce settimanali ricorrenti, valide in un intervallo di date.
CREATE TABLE availabilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER NOT NULL,
  valid_from TEXT NOT NULL CHECK (
    valid_from GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  ),
  valid_until TEXT NOT NULL CHECK (
    valid_until GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
    AND valid_until >= valid_from
  ),
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time TEXT NOT NULL CHECK (
    start_time GLOB '[0-2][0-9]:[0-5][0-9]'
    AND substr(start_time, 1, 2) BETWEEN '00' AND '23'
  ),
  end_time TEXT NOT NULL CHECK (
    end_time GLOB '[0-2][0-9]:[0-5][0-9]'
    AND substr(end_time, 1, 2) BETWEEN '00' AND '23'
    AND end_time > start_time
  ),
  is_retired INTEGER NOT NULL DEFAULT 0 CHECK (is_retired IN (0, 1)),
  UNIQUE (id, space_id),
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
);

-- Indisponibilita eccezionali riferite a una data precisa.
CREATE TABLE unavailabilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER NOT NULL,
  date TEXT NOT NULL CHECK (
    date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  ),
  start_time TEXT NOT NULL CHECK (
    start_time GLOB '[0-2][0-9]:[0-5][0-9]'
    AND substr(start_time, 1, 2) BETWEEN '00' AND '23'
  ),
  end_time TEXT NOT NULL CHECK (
    end_time GLOB '[0-2][0-9]:[0-5][0-9]'
    AND substr(end_time, 1, 2) BETWEEN '00' AND '23'
    AND end_time > start_time
  ),
  reason TEXT NOT NULL CHECK (length(trim(reason)) > 0),
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
);

-- Snapshot delle fasce concrete usato per le statistiche storiche.
CREATE TABLE slot_occurrences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER NOT NULL,
  date TEXT NOT NULL CHECK (
    date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  ),
  start_time TEXT NOT NULL CHECK (
    start_time GLOB '[0-2][0-9]:[0-5][0-9]'
    AND substr(start_time, 1, 2) BETWEEN '00' AND '23'
  ),
  end_time TEXT NOT NULL CHECK (
    end_time GLOB '[0-2][0-9]:[0-5][0-9]'
    AND substr(end_time, 1, 2) BETWEEN '00' AND '23'
    AND end_time > start_time
  ),
  offered_capacity INTEGER,
  was_offered INTEGER,
  finalized_at TEXT,
  UNIQUE (space_id, date, start_time, end_time),
  CHECK (
    (
      finalized_at IS NULL
      AND offered_capacity IS NULL
      AND was_offered IS NULL
    )
    OR (
      finalized_at IS NOT NULL
      AND length(trim(finalized_at)) > 0
      AND was_offered = 1
      AND offered_capacity > 0
    )
    OR (
      finalized_at IS NOT NULL
      AND length(trim(finalized_at)) > 0
      AND was_offered = 0
      AND offered_capacity = 0
    )
  ),
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
);

-- Account normali e amministratori.
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL CHECK (length(trim(first_name)) > 0),
  last_name TEXT NOT NULL CHECK (length(trim(last_name)) > 0),
  email TEXT NOT NULL UNIQUE CHECK (
    length(email) > 0
    AND email = lower(trim(email))
  ),
  password_hash TEXT NOT NULL CHECK (length(trim(password_hash)) > 0),
  role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
  created_at TEXT NOT NULL CHECK (length(trim(created_at)) > 0)
);

-- Prenotazioni riferite a uno spazio e a una configurazione coerente.
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER NOT NULL,
  availability_id INTEGER NOT NULL,
  date TEXT NOT NULL CHECK (
    date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  ),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (
    status IN ('confirmed', 'completed')
  ),
  created_at TEXT NOT NULL CHECK (length(trim(created_at)) > 0),
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE,
  FOREIGN KEY (availability_id, space_id)
    REFERENCES availabilities(id, space_id)
    ON DELETE CASCADE
);

-- Persone associate alle prenotazioni, incluso l'organizzatore.
CREATE TABLE booking_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  participant_role TEXT NOT NULL CHECK (
    participant_role IN ('organizer', 'participant')
  ),
  present INTEGER NOT NULL DEFAULT 0 CHECK (present IN (0, 1)),
  checked_in_at TEXT,
  UNIQUE (booking_id, user_id),
  CHECK (
    (present = 0 AND checked_in_at IS NULL)
    OR (
      present = 1
      AND checked_in_at IS NOT NULL
      AND length(trim(checked_in_at)) > 0
    )
  ),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Spazi salvati dagli utenti.
CREATE TABLE favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  space_id INTEGER NOT NULL,
  created_at TEXT NOT NULL CHECK (length(trim(created_at)) > 0),
  UNIQUE (user_id, space_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
);

-- Segnalazioni degli utenti relative agli spazi.
CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  space_id INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('technical', 'accessibility', 'cleaning', 'other')
  ),
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_progress', 'resolved')
  ),
  photo_path TEXT CHECK (
    photo_path IS NULL OR length(trim(photo_path)) > 0
  ),
  created_at TEXT NOT NULL CHECK (length(trim(created_at)) > 0),
  updated_at TEXT NOT NULL CHECK (
    length(trim(updated_at)) > 0
    AND updated_at >= created_at
  ),
  CHECK (
    (category IN ('technical', 'accessibility') AND priority = 'high')
    OR (category = 'cleaning' AND priority = 'medium')
    OR (category = 'other' AND priority = 'low')
  ),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
);

-- Avvisi globali pubblicati dagli amministratori.
CREATE TABLE announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  message TEXT NOT NULL CHECK (length(trim(message)) > 0),
  created_at TEXT NOT NULL CHECK (length(trim(created_at)) > 0),
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Notifiche personali, automatiche oppure generate da un avviso globale.
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  announcement_id INTEGER,
  type TEXT NOT NULL CHECK (length(trim(type)) > 0),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  message TEXT NOT NULL CHECK (length(trim(message)) > 0),
  created_at TEXT NOT NULL CHECK (length(trim(created_at)) > 0),
  read_at TEXT CHECK (read_at IS NULL OR length(trim(read_at)) > 0),
  UNIQUE (user_id, announcement_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (announcement_id)
    REFERENCES announcements(id)
    ON DELETE CASCADE
);

-- Una sola sessione autenticata attiva per account.
CREATE TABLE auth_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  refresh_token_hash TEXT NOT NULL UNIQUE CHECK (
    length(trim(refresh_token_hash)) > 0
  ),
  access_token_jti TEXT NOT NULL UNIQUE CHECK (
    length(trim(access_token_jti)) > 0
  ),
  refresh_expires_at TEXT NOT NULL CHECK (
    length(trim(refresh_expires_at)) > 0
  ),
  created_at TEXT NOT NULL CHECK (length(trim(created_at)) > 0),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Richieste di prenotazione gia elaborate per garantire l'idempotenza.
CREATE TABLE booking_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL CHECK (
    length(trim(idempotency_key)) > 0
  ),
  request_hash TEXT NOT NULL CHECK (length(trim(request_hash)) > 0),
  booking_id INTEGER,
  created_at TEXT NOT NULL CHECK (length(trim(created_at)) > 0),
  UNIQUE (user_id, idempotency_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- Una configurazione attiva non puo essere duplicata esattamente.
-- Le sovrapposizioni parziali richiedono il controllo transazionale del backend.
CREATE UNIQUE INDEX uq_active_availability_exact
  ON availabilities (
    space_id,
    valid_from,
    valid_until,
    weekday,
    start_time,
    end_time
  )
  WHERE is_retired = 0;

-- Il database impedisce due organizzatori nella stessa prenotazione.
-- La presenza di almeno un organizzatore viene garantita dalla transazione backend.
CREATE UNIQUE INDEX uq_booking_single_organizer
  ON booking_participants (booking_id)
  WHERE participant_role = 'organizer';
