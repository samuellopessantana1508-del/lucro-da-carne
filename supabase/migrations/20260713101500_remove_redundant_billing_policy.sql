-- RLS denies rows by default. Keep the admin-only SELECT policy as the sole
-- authenticated policy so Postgres does not evaluate a redundant false rule.
DROP POLICY IF EXISTS billing_events_no_client_access ON public.billing_events;
