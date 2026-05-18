-- Row-level security: user-scoped data policies
-- Closes #10
-- Depends on: auth wired (#7, #8)

ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their labels" ON labels
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their recipes" ON recipes
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their batches" ON batches
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their meals" ON meals
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- meal_components are accessed via their parent meal; enforce via user_id join
ALTER TABLE meal_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their meal components" ON meal_components
  USING (
    EXISTS (
      SELECT 1 FROM meals
      WHERE meals.id = meal_components.meal_id
        AND meals.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meals
      WHERE meals.id = meal_components.meal_id
        AND meals.user_id = auth.uid()
    )
  );

ALTER TABLE user_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their rules" ON user_rules
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
