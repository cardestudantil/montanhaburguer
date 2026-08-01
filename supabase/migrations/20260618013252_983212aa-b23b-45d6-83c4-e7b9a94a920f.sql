
-- Restrict SECURITY DEFINER function execution to only the roles that need it
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon, authenticated;

-- Tighten the public order-creation policies (still public but with sanity checks)
DROP POLICY "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT TO anon, authenticated
WITH CHECK (
  length(trim(customer_name)) > 0
  AND length(trim(customer_phone)) > 0
  AND length(trim(customer_address)) > 0
  AND total >= 0
);

DROP POLICY "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Anyone can insert order items" ON public.order_items FOR INSERT TO anon, authenticated
WITH CHECK (
  order_id IS NOT NULL
  AND quantity > 0
  AND unit_price >= 0
);
