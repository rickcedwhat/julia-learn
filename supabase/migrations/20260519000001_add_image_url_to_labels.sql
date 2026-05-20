-- Add image_url column to labels for OCR source image storage
-- Closes #70

ALTER TABLE labels ADD COLUMN IF NOT EXISTS image_url text;
