CREATE OR REPLACE FUNCTION public.claim_access_role(requested public.app_role DEFAULT 'user'::public.app_role)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  existing_role public.app_role;
  target_role public.app_role;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT role INTO existing_role
  FROM public.user_roles
  WHERE user_id = current_user_id
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'lanchonete' THEN 2 ELSE 3 END
  LIMIT 1;

  IF existing_role IS NOT NULL THEN
    RETURN existing_role;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    target_role := 'admin'::public.app_role;
  ELSIF requested = 'lanchonete'::public.app_role THEN
    target_role := 'lanchonete'::public.app_role;
  ELSE
    target_role := 'user'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (current_user_id, target_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN target_role;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_access_role(public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_access_role(public.app_role) TO authenticated;