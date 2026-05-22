/*
  # Create initial schema for Persian Translator App

  1. New Tables
    - `profiles` - User profiles with display name and settings
    - `translations` - Translation history with original word, translation, pronunciation
    - `vocab_lists` - Vocabulary lists created by users
    - `user_progress` - User progress tracking (points, streaks, badges)
    - `session_history` - Learning session history (quiz, vocab, grammar)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Translations table
CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  original_word text NOT NULL,
  source_language text NOT NULL DEFAULT 'français',
  target_language text NOT NULL DEFAULT 'persan',
  persian_translation text,
  pronunciation text,
  definition text,
  created_at timestamptz DEFAULT now()
);

-- Vocab lists table
CREATE TABLE IF NOT EXISTS vocab_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT 'indigo',
  words jsonb DEFAULT '[]',
  source_language text DEFAULT 'français',
  target_language text DEFAULT 'persan',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email text NOT NULL,
  display_name text DEFAULT '',
  total_points integer DEFAULT 0,
  correct_answers integer DEFAULT 0,
  total_answers integer DEFAULT 0,
  streak integer DEFAULT 0,
  best_streak integer DEFAULT 0,
  badges jsonb DEFAULT '[]',
  exercises_done integer DEFAULT 0,
  exercises_correct integer DEFAULT 0,
  exercises_total integer DEFAULT 0,
  exercises_points integer DEFAULT 0,
  sessions_count integer DEFAULT 0,
  last_activity timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Session history table
CREATE TABLE IF NOT EXISTS session_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  section text NOT NULL,
  word_original text,
  word_translation text,
  word_pronunciation text,
  word_definition text,
  quiz_result text,
  topic text,
  source_language text,
  target_language text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Translations policies
CREATE POLICY "Users can view own translations"
  ON translations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own translations"
  ON translations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own translations"
  ON translations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Vocab lists policies
CREATE POLICY "Users can view own vocab lists"
  ON vocab_lists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vocab lists"
  ON vocab_lists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vocab lists"
  ON vocab_lists FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vocab lists"
  ON vocab_lists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- User progress policies
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Session history policies
CREATE POLICY "Users can view own session history"
  ON session_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own session history"
  ON session_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own session history"
  ON session_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_translations_user_id ON translations(user_id);
CREATE INDEX IF NOT EXISTS idx_translations_created_at ON translations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vocab_lists_user_id ON vocab_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_session_history_user_id ON session_history(user_id);
CREATE INDEX IF NOT EXISTS idx_session_history_created_at ON session_history(created_at DESC);
