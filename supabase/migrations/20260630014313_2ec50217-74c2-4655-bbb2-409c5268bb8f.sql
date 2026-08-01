
GRANT SELECT ON public.orders TO anon;
GRANT SELECT ON public.order_items TO anon;

DROP POLICY IF EXISTS "Anyone can read orders by id" ON public.orders;
CREATE POLICY "Anyone can read orders by id" ON public.orders FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read order items" ON public.order_items;
CREATE POLICY "Anyone can read order items" ON public.order_items FOR SELECT TO anon, authenticated USING (true);
