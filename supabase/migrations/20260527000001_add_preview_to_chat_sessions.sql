-- Add preview column to chat_sessions to avoid fetching full messages array in drawer
-- The full messages JSONB can exceed 4MB for 30 sessions, stalling mobile requests

ALTER TABLE chat_sessions ADD COLUMN preview text;
