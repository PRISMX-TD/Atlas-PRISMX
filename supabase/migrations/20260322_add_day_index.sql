-- Add day_index to locations, transportations, accommodations

ALTER TABLE locations ADD COLUMN IF NOT EXISTS day_index INTEGER DEFAULT 0;
ALTER TABLE transportations ADD COLUMN IF NOT EXISTS day_index INTEGER DEFAULT 0;
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS day_index INTEGER DEFAULT 0;
