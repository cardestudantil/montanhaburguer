DROP FUNCTION IF EXISTS public.claim_access_role(public.app_role);

DROP POLICY IF EXISTS "Users can claim own staff role" ON public.user_roles;

CREATE POLICY "Users can claim own staff role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    role IN ('lanchonete'::public.app_role, 'user'::public.app_role)
    OR (
      role = 'admin'::public.app_role
      AND NOT EXISTS (
        SELECT 1
        FROM public.user_roles existing_roles
        WHERE existing_roles.role = 'admin'::public.app_role
      )
    )
  )
);