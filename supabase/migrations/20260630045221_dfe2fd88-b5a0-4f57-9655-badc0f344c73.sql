
-- Add-ons (adicionais) per menu item
CREATE TABLE public.menu_item_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.menu_item_addons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_item_addons TO authenticated;
GRANT ALL ON public.menu_item_addons TO service_role;

ALTER TABLE public.menu_item_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addons readable by anyone"
  ON public.menu_item_addons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff manage addons - insert"
  ON public.menu_item_addons FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lanchonete'));
CREATE POLICY "staff manage addons - update"
  ON public.menu_item_addons FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lanchonete'));
CREATE POLICY "staff manage addons - delete"
  ON public.menu_item_addons FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lanchonete'));

CREATE TRIGGER set_updated_at_menu_item_addons
  BEFORE UPDATE ON public.menu_item_addons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Store chosen add-ons on each order line
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS addons JSONB NOT NULL DEFAULT '[]'::jsonb;
