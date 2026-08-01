CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  requested text;
BEGIN
  requested := NEW.raw_user_meta_data->>'requested_role';

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSIF requested = 'lanchonete' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'lanchonete') ON CONFLICT DO NOTHING;
  ELSIF requested = 'admin' THEN
    -- Só permite admin adicional via cadastro se solicitado explicitamente E nenhum admin logado restringe; mantemos como 'user' por segurança
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;

-- Garante que o trigger existe em auth.users
DROP TRIGGER IF EXISTS bootstrap_first_admin_trigger ON auth.users;
CREATE TRIGGER bootstrap_first_admin_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_first_admin();