ALTER TABLE users ADD COLUMN profile_photo BLOB CHECK (
  profile_photo IS NULL OR length(profile_photo) BETWEEN 1 AND 2097152
);

ALTER TABLE users ADD COLUMN profile_photo_type TEXT CHECK (
  profile_photo_type IS NULL OR profile_photo_type IN ('image/jpeg', 'image/png', 'image/webp')
);
