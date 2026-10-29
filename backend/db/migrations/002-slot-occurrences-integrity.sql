-- SQLite accetta un CHECK che restituisce NULL: nei casi consolidati
-- occorre richiedere esplicitamente capienza e stato non nulli.
-- La transazione e gestita da migrate.js. Dati preesistenti non validi
-- fanno fallire la copia e annullano l'intera migrazione.
CREATE TABLE slot_occurrences_new (
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
      AND offered_capacity IS NOT NULL
      AND was_offered IS NOT NULL
      AND (
        (was_offered = 1 AND offered_capacity > 0)
        OR (was_offered = 0 AND offered_capacity = 0)
      )
    )
  ),
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
);

INSERT INTO slot_occurrences_new (
  id, space_id, date, start_time, end_time,
  offered_capacity, was_offered, finalized_at
)
SELECT id, space_id, date, start_time, end_time,
       offered_capacity, was_offered, finalized_at
FROM slot_occurrences;

-- Conserva anche gli ID di righe gia eliminate, per non riutilizzarli.
UPDATE sqlite_sequence
SET seq = MAX(seq, COALESCE(
  (SELECT seq FROM sqlite_sequence WHERE name = 'slot_occurrences'), 0
))
WHERE name = 'slot_occurrences_new';

DROP TABLE slot_occurrences;
ALTER TABLE slot_occurrences_new RENAME TO slot_occurrences;
