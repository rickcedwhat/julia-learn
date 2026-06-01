-- Add freeform ingredient list to recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ingredients text;

-- Allow batches to be traced back from a label
ALTER TABLE labels ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES batches(id) ON DELETE SET NULL;

-- Extend the origin enum to include batch-derived labels
ALTER TABLE labels DROP CONSTRAINT IF EXISTS labels_origin_check;
ALTER TABLE labels ADD CONSTRAINT labels_origin_check
  CHECK (origin IN ('verified_label', 'user_generated', 'ai_estimated', 'batch'));
