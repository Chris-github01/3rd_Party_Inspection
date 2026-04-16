/*
  # Enable pg_cron and pg_net, schedule AI worker

  Installs pg_cron and pg_net extensions, then schedules the inspection-ai-worker
  edge function to run every minute via an HTTP POST using pg_net.

  The worker fetches up to 5 queued jobs per tick and processes them safely
  with provider fallback (Gemini -> Anthropic).
*/

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'inspection-ai-worker-tick',
  '* * * * *',
  $$
  SELECT extensions.http_post(
    url     := (SELECT setting FROM pg_settings WHERE name = 'app.settings.service_url' LIMIT 1)
               || '/functions/v1/inspection-ai-worker',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := '{}'
  )
  $$
);
