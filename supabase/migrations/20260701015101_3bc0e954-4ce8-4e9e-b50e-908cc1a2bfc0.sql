
-- 1) Orders: add per-order client token
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_token uuid NOT NULL DEFAULT gen_random_uuid();

-- 2) Drop overly-permissive SELECT policies on orders/order_items
DROP POLICY IF EXISTS "Anyone can read orders by id" ON public.orders;
DROP POLICY IF EXISTS "Anyone can read order items" ON public.order_items;

-- 3) Secure lookup RPC for customers (SECURITY DEFINER, token-gated)
CREATE OR REPLACE FUNCTION public.get_my_orders(_ids uuid[], _tokens uuid[])
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF _ids IS NULL OR _tokens IS NULL
     OR COALESCE(array_length(_ids, 1), 0) <> COALESCE(array_length(_tokens, 1), 0)
     OR COALESCE(array_length(_ids, 1), 0) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      to_jsonb(o) || jsonb_build_object('order_items', COALESCE(items, '[]'::jsonb))
      ORDER BY o.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO result
  FROM public.orders o
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(to_jsonb(oi) ORDER BY oi.created_at) AS items
    FROM public.order_items oi
    WHERE oi.order_id = o.id
  ) i ON true
  WHERE (o.id, o.client_token) IN (
    SELECT UNNEST(_ids), UNNEST(_tokens)
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_orders(uuid[], uuid[]) TO anon, authenticated;

-- 4) user_roles: remove self-service staff role INSERT
DROP POLICY IF EXISTS "Users can claim own staff role" ON public.user_roles;

-- 5) storage: remove world-writable payment-proofs UPDATE, add admin-only UPDATE/DELETE
DROP POLICY IF EXISTS "Anyone can update payment proofs" ON storage.objects;

CREATE POLICY "Admins can update payment proofs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete payment proofs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));

-- 6) storage: restrict media bucket writes to admin/lanchonete
DROP POLICY IF EXISTS "media_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "media_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "media_authenticated_delete" ON storage.objects;

CREATE POLICY "media_staff_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'media' AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lanchonete')
  )
);

CREATE POLICY "media_staff_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'media' AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lanchonete')
  )
)
WITH CHECK (
  bucket_id = 'media' AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lanchonete')
  )
);

CREATE POLICY "media_staff_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'media' AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lanchonete')
  )
);
