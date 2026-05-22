-- Search synonyms assigned by AI on label save (e.g. "Tostitos" → ["chips","tortilla","snack"])
-- Separate from `tags` (categorical/math tags shown in UI); meta_tags are hidden and search-only.
ALTER TABLE labels ADD COLUMN IF NOT EXISTS meta_tags text[] NOT NULL DEFAULT '{}';
