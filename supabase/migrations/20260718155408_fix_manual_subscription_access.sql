-- Manual paid grants created from an expired trial inherited the old expiry,
-- so both the UI and the database still denied access despite status=active.
UPDATE public.subscriptions
SET
  billing_cycle = CASE plan WHEN 'business' THEN 'annual' ELSE 'monthly' END,
  current_period_start = now(),
  current_period_end = NULL,
  expires_at = NULL,
  cancel_at_period_end = false,
  updated_at = now()
WHERE plan IN ('pro', 'business')
  AND status = 'active'
  AND provider = 'manual'
  AND expires_at IS NOT NULL
  AND expires_at <= now();

UPDATE public.subscriptions
SET
  billing_cycle = CASE plan WHEN 'business' THEN 'annual' ELSE 'monthly' END,
  updated_at = now()
WHERE provider = 'manual'
  AND plan IN ('pro', 'business')
  AND billing_cycle IS DISTINCT FROM CASE plan WHEN 'business' THEN 'annual' ELSE 'monthly' END;

-- The admin update remains protected by the admin-only RLS policy, while this
-- column grant allows the UI to keep the manual plan cycle consistent.
GRANT UPDATE (billing_cycle) ON public.subscriptions TO authenticated;

-- Keep an open customer session synchronized after an administrator changes
-- the subscription. RLS still limits each customer to their own row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
  END IF;
END;
$$;
