ALTER TABLE reports ADD COLUMN photo_data BLOB;
ALTER TABLE reports ADD COLUMN photo_type TEXT CHECK (photo_type IS NULL OR photo_type IN ('image/jpeg', 'image/png', 'image/webp'));
