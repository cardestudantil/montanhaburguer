DROP TRIGGER IF EXISTS tr_bootstrap_admin ON auth.users;
DROP TRIGGER IF EXISTS bootstrap_first_admin_trigger ON auth.users;

CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested text;
  target_role public.app_role;
BEGIN
  requested := COALESCE(NEW.raw_user_meta_data->>'requested_role', 'user');

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    target_role := 'admin';
  ELSIF requested = 'lanchonete' THEN
    target_role := 'lanchonete';
  ELSE
    target_role := 'user';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, target_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bootstrap_first_admin_trigger
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.bootstrap_first_admin();

UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id,
       CASE
         WHEN NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN 'admin'::public.app_role
         WHEN u.raw_user_meta_data->>'requested_role' = 'lanchonete' THEN 'lanchonete'::public.app_role
         ELSE 'user'::public.app_role
       END
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id
)
ON CONFLICT (user_id, role) DO NOTHING;