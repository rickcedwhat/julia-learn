-- Add serving_size to labels so Gemini can do piece-count math
-- Closes #83

ALTER TABLE labels ADD COLUMN IF NOT EXISTS serving_size text;
