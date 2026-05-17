-- Initial schema: labels, recipes, batches, meals, meal_components, user_rules
-- Closes #9

CREATE TABLE labels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id),
  name        text NOT NULL,
  origin      text NOT NULL CHECK (origin IN ('verified_label', 'user_generated', 'ai_estimated')),
  calories    numeric,
  protein_g   numeric,
  fat_g       numeric,
  carbs_g     numeric,
  fiber_g     numeric,
  sugar_g     numeric,
  tags        text[],
  protected   boolean NOT NULL DEFAULT false,
  version     integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE recipes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id),
  name        text NOT NULL,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE batches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id),
  recipe_id       uuid REFERENCES recipes(id),
  name            text NOT NULL,
  marker_label    text,
  marker_color    text,
  total_weight_g  numeric,
  total_macros    jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE meals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id),
  name            text NOT NULL,
  meal_type       text CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  computed_macros jsonb,
  kickoff_export  text,
  logged_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE meal_components (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id      uuid NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  label_id     uuid REFERENCES labels(id),
  batch_id     uuid REFERENCES batches(id),
  weight_g     numeric,
  scale_factor numeric,
  CONSTRAINT meal_component_source CHECK (
    (label_id IS NOT NULL) OR (batch_id IS NOT NULL)
  )
);

CREATE TABLE user_rules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id),
  macro       text NOT NULL,
  scope       text NOT NULL CHECK (scope IN ('per_meal', 'per_day')),
  operator    text NOT NULL CHECK (operator IN ('<=', '>=', '=')),
  value       numeric NOT NULL,
  value_type  text NOT NULL CHECK (value_type IN ('absolute', 'ratio')),
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_calorie_ratio CHECK (
    NOT (macro = 'calories' AND value_type = 'ratio')
  )
);
