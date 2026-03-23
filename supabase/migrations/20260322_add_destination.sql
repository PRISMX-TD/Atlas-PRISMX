-- Add destination column to trips table
ALTER TABLE trips ADD COLUMN destination VARCHAR(200);

-- Migrate existing data if any (assuming description was used for destination temporarily)
UPDATE trips SET destination = description WHERE destination IS NULL;