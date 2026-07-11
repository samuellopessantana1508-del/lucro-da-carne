CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, business_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'business_name', '')
  );

  INSERT INTO public.subscriptions (user_id, plan, status, lots_limit)
  VALUES (NEW.id, 'gratis', 'active', 5);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION private.can_insert_lot(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT target_user_id = (SELECT auth.uid())
    AND COALESCE((
      SELECT s.status = 'active'
        AND (s.expires_at IS NULL OR s.expires_at > now())
        AND (
          s.lots_limit >= 9999
          OR (
            SELECT count(*)
            FROM public.lots l
            WHERE l.user_id = target_user_id
          ) < s.lots_limit
        )
      FROM public.subscriptions s
      WHERE s.user_id = target_user_id
    ), false);
$$;

REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_insert_lot(UUID) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_insert_lot(UUID) TO authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

DROP TRIGGER IF EXISTS set_lots_updated_at ON public.lots;
CREATE TRIGGER set_lots_updated_at
  BEFORE UPDATE ON public.lots
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION private.update_updated_at();

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
CREATE POLICY profiles_select_own_or_admin
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id OR (SELECT private.is_admin()));

DROP POLICY IF EXISTS lots_select_own ON public.lots;
DROP POLICY IF EXISTS lots_select_admin ON public.lots;
DROP POLICY IF EXISTS lots_select_own_or_admin ON public.lots;
CREATE POLICY lots_select_own_or_admin
  ON public.lots FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT private.is_admin()));

DROP POLICY IF EXISTS lots_insert_own ON public.lots;
CREATE POLICY lots_insert_own
  ON public.lots FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (SELECT private.can_insert_lot(user_id))
  );

DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_select_admin ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_select_own_or_admin ON public.subscriptions;
CREATE POLICY subscriptions_select_own_or_admin
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT private.is_admin()));

DROP POLICY IF EXISTS subscriptions_update_admin ON public.subscriptions;
CREATE POLICY subscriptions_update_admin
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

DROP POLICY IF EXISTS billing_events_no_client_access ON public.billing_events;
CREATE POLICY billing_events_no_client_access
  ON public.billing_events FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.can_insert_lot(UUID);
