-- Persist chat sessions so conversations survive page refresh
-- Closes #77

CREATE TABLE chat_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id),
  messages   jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own their chat sessions" ON chat_sessions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
