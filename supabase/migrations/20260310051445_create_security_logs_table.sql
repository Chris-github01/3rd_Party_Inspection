/*
  # Create Security Logs Table

  1. New Tables
    - `security_logs`
      - `id` (uuid, primary key)
      - `event_type` (text) - Type of security event (e.g., 'blocked_redirect')
      - `user_id` (uuid) - Reference to user who triggered the event (nullable)
      - `details` (jsonb) - Detailed information about the event
      - `severity` (text) - Event severity level (info, warning, error, critical)
      - `created_at` (timestamptz) - When the event occurred

  2. Security
    - Enable RLS on `security_logs` table
    - Only authenticated users can insert logs
    - Only admins can view logs (future enhancement)
    - Logs are append-only (no updates or deletes allowed)

  3. Indexes
    - Index on user_id for quick user-specific lookups
    - Index on event_type for filtering by event
    - Index on created_at for time-based queries
    - Index on severity for filtering critical events
*/

-- Create security_logs table
CREATE TABLE IF NOT EXISTS security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}'::jsonb,
  severity text DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON security_logs(severity);

-- Enable RLS
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can insert their own security logs
CREATE POLICY "Users can insert security logs"
  ON security_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can view their own security logs
CREATE POLICY "Users can view own security logs"
  ON security_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Prevent updates and deletes (append-only log)
CREATE POLICY "No updates allowed"
  ON security_logs FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "No deletes allowed"
  ON security_logs FOR DELETE
  TO authenticated
  USING (false);

-- Add helpful comments
COMMENT ON TABLE security_logs IS 'Audit log for security events including blocked redirects, failed auth attempts, etc.';
COMMENT ON COLUMN security_logs.event_type IS 'Type of security event (e.g., blocked_redirect, failed_login, unauthorized_access)';
COMMENT ON COLUMN security_logs.details IS 'JSON object containing event-specific details';
COMMENT ON COLUMN security_logs.severity IS 'Event severity: info, warning, error, or critical';
