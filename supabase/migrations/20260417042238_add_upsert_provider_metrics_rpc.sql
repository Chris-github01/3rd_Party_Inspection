/*
  # Add upsert_provider_metrics RPC

  Provides an upsert function for tracking AI provider performance metrics
  per organization per hour. Called from inspection-ai-analyse after each
  successful analysis to accumulate success/failure counts, latency totals,
  and confidence averages.

  1. New Function
    - `upsert_provider_metrics(p_org_id, p_provider, p_model, p_success, p_latency_ms, p_confidence, p_hour)`
    - Inserts or updates a row in inspection_ai_provider_metrics for the given org/provider/model/hour
    - Uses ON CONFLICT to accumulate running totals

  2. Notes
    - Security definer so edge functions (service role) can call it
    - search_path locked to public for security
*/

CREATE OR REPLACE FUNCTION public.upsert_provider_metrics(
  p_org_id uuid,
  p_provider text,
  p_model text,
  p_success boolean,
  p_latency_ms integer,
  p_confidence numeric,
  p_hour timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO inspection_ai_provider_metrics (
    organization_id,
    provider,
    model,
    success_count,
    failure_count,
    total_latency_ms,
    avg_confidence,
    last_success_at,
    last_failure_at,
    recorded_hour
  ) VALUES (
    p_org_id,
    p_provider,
    p_model,
    CASE WHEN p_success THEN 1 ELSE 0 END,
    CASE WHEN p_success THEN 0 ELSE 1 END,
    p_latency_ms,
    p_confidence,
    CASE WHEN p_success THEN now() ELSE NULL END,
    CASE WHEN p_success THEN NULL ELSE now() END,
    p_hour
  )
  ON CONFLICT (organization_id, provider, model, recorded_hour)
  DO UPDATE SET
    success_count = inspection_ai_provider_metrics.success_count + CASE WHEN p_success THEN 1 ELSE 0 END,
    failure_count = inspection_ai_provider_metrics.failure_count + CASE WHEN p_success THEN 0 ELSE 1 END,
    total_latency_ms = inspection_ai_provider_metrics.total_latency_ms + p_latency_ms,
    avg_confidence = (
      inspection_ai_provider_metrics.avg_confidence * (inspection_ai_provider_metrics.success_count + inspection_ai_provider_metrics.failure_count)
      + p_confidence
    ) / NULLIF(inspection_ai_provider_metrics.success_count + inspection_ai_provider_metrics.failure_count + 1, 0),
    last_success_at = CASE WHEN p_success THEN now() ELSE inspection_ai_provider_metrics.last_success_at END,
    last_failure_at = CASE WHEN NOT p_success THEN now() ELSE inspection_ai_provider_metrics.last_failure_at END;
END;
$$;
