-- Stato tecnico del consolidatore. La riga singleton viene inizializzata
-- al primo avvio del server: non si ricostruisce il periodo precedente.
CREATE TABLE occurrence_tracking (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  tracking_started_at TEXT NOT NULL CHECK (length(trim(tracking_started_at)) > 0),
  consolidated_until TEXT NOT NULL CHECK (length(trim(consolidated_until)) > 0)
);

-- Eventi che impediscono di usare una concreta occorrenza nel denominatore.
-- La tabella separata evita di cambiare la forma di slot_occurrences gia
-- applicata e permette di annotare anche un orario locale inesistente.
CREATE TABLE occurrence_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER NOT NULL,
  date TEXT NOT NULL CHECK (
    date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  ),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  issue TEXT NOT NULL CHECK (
    issue IN ('ambiguous_time', 'nonexistent_time', 'overlapping_intervals')
  ),
  details TEXT,
  detected_at TEXT NOT NULL CHECK (length(trim(detected_at)) > 0),
  UNIQUE (space_id, date, start_time, end_time, issue),
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
);

