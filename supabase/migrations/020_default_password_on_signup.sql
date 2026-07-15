-- Migration 020: guarantee every newly created account has the default password.
-- Any auth.users row created by any path (Supabase dashboard, admin API, invite
-- flow, etc.) is (re)set to the shared default `roat@1234` and has its email
-- confirmed, so the user can sign in immediately. GoTrue stores a random hash
-- even for "passwordless" admin creates, so the default is applied
-- unconditionally at creation time. Self-set passwords later are UPDATEs to
-- auth.users and never reach this AFTER INSERT trigger, so they are never
-- clobbered. The user is still routed to /setup-password on first login because
-- profiles.onboarding_completed_at starts NULL.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Mirror the auth user into profiles (idempotent).
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  -- Always assign the default password + confirm the email at creation.
  UPDATE auth.users
  SET encrypted_password = extensions.crypt('roat@1234', extensions.gen_salt('bf', 10)),
      email_confirmed_at  = COALESCE(email_confirmed_at, NOW())
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
