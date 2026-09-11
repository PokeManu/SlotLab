ALTER TABLE availabilities ADD COLUMN superseded_by_id INTEGER REFERENCES availabilities(id) ON DELETE SET NULL;
CREATE INDEX idx_availabilities_superseded_by_id ON availabilities (superseded_by_id);
