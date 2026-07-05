
-- Grants the calling authenticated user the 'admin' role, but ONLY if
-- no admin currently exists. After the first admin is created, this
-- function does nothing and returns false.
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _has_any_admin boolean;
BEGIN
  IF _uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'admin')
    INTO _has_any_admin;

  IF _has_any_admin THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'admin')
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_first_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

-- Public helper so the setup page can tell whether bootstrap is still open,
-- without exposing the user_roles table.
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'admin');
$$;

REVOKE ALL ON FUNCTION public.admin_exists() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;
