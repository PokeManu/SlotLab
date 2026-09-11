-- Coda tecnica persistente: il rollback SQLite non ripristina file eliminati.
-- Conserva soltanto nomi opachi, senza riferimenti all'account cancellato.
CREATE TABLE file_deletions (
  filename TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL
);
