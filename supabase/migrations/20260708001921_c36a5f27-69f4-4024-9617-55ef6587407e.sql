
CREATE OR REPLACE FUNCTION public.is_recent_pending_order(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = _order_id
      AND o.status = 'pending'
      AND o.created_at > now() - interval '10 minutes'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_recent_pending_order(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can insert order items for recent pending orders" ON public.order_items;

CREATE POLICY "Anyone can insert order items for recent pending orders"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  order_id IS NOT NULL
  AND quantity > 0
  AND unit_price >= 0
  AND public.is_recent_pending_order(order_id)
);
