DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;

CREATE POLICY "Anyone can insert order items for recent pending orders"
ON public.order_items
FOR INSERT
WITH CHECK (
  order_id IS NOT NULL
  AND quantity > 0
  AND unit_price >= 0
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.status = 'pending'
      AND o.created_at > now() - interval '10 minutes'
  )
);