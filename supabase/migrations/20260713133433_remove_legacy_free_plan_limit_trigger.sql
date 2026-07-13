DROP TRIGGER IF EXISTS enforce_free_plan_limit_trigger ON public.subscriptions;
DROP FUNCTION IF EXISTS public.enforce_free_plan_limit();

UPDATE public.subscriptions
SET
  lots_limit = 9999,
  billing_cycle = 'free',
  current_period_start = COALESCE(current_period_start, started_at, created_at),
  current_period_end = COALESCE(expires_at, started_at + interval '3 days', created_at + interval '3 days'),
  expires_at = COALESCE(expires_at, started_at + interval '3 days', created_at + interval '3 days'),
  free_uses_consumed = 0
WHERE plan = 'gratis';
