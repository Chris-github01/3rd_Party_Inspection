/*
  # Extend user_profiles for Field Operations

  ## What This Does
  Adds the missing columns to user_profiles that a field inspection platform
  needs: mobile number, active flag, and a display avatar URL.
  All columns are nullable — no existing rows are affected.

  ## Changes to user_profiles
  - `mobile` (text, nullable) — inspector mobile number for contact/notifications
  - `active` (boolean, default true) — soft-disable accounts without deletion
  - `avatar_url` (text, nullable) — profile photo URL from storage

  ## Notes
  - No destructive changes
  - All columns nullable or have safe defaults
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'mobile'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN mobile text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'active'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN active boolean DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN avatar_url text;
  END IF;
END $$;
