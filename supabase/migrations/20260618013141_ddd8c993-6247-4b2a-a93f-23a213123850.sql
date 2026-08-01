
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- CATEGORIES
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tr_cat_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- MENU ITEMS
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  old_price NUMERIC(10,2) CHECK (old_price IS NULL OR old_price >= 0),
  image_url TEXT,
  tag TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active items" ON public.menu_items FOR SELECT TO anon USING (active = true);
CREATE POLICY "Authenticated can view all items" ON public.menu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert items" ON public.menu_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update items" ON public.menu_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete items" ON public.menu_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tr_items_updated BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- STORE INFO (singleton)
CREATE TABLE public.store_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Marcão Lanches',
  tagline TEXT,
  address TEXT,
  phone TEXT,
  hours TEXT,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_order NUMERIC(10,2) NOT NULL DEFAULT 0,
  banner_url TEXT,
  logo_url TEXT,
  is_open BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_info TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_info TO authenticated;
GRANT ALL ON public.store_info TO service_role;
ALTER TABLE public.store_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view store info" ON public.store_info FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert store info" ON public.store_info FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update store info" ON public.store_info FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tr_store_updated BEFORE UPDATE ON public.store_info FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed one row for store_info
INSERT INTO public.store_info (name, tagline, address, phone, hours, delivery_fee, min_order, is_open)
VALUES ('Marcão Lanches', 'Hambúrgueres artesanais em São Bernardo', 'Rua da Brasa, 478 - São Bernardo do Campo, SP', '(11) 4778-6472', 'Aberto até às 22h45', 7.90, 0, true);

-- ORDERS
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  notes TEXT,
  subtotal NUMERIC(10,2) NOT NULL,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT INSERT ON public.orders TO anon;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tr_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ORDER ITEMS
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  line_total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT INSERT ON public.order_items TO anon;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert order items" ON public.order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update order items" ON public.order_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete order items" ON public.order_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger: first signed-up user becomes admin automatically
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tr_bootstrap_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.bootstrap_first_admin();

-- Seed default categories
INSERT INTO public.categories (name, position) VALUES
  ('Promoções', 1),
  ('Combos do Marcão', 2),
  ('Hambúrgueres artesanais', 3),
  ('Hot Dogs', 4),
  ('Marmitex executiva', 5),
  ('Salgados fritos', 6);

-- Seed menu items
WITH cats AS (SELECT id, name FROM public.categories)
INSERT INTO public.menu_items (category_id, name, description, price, old_price, tag, featured, image_url, position) VALUES
  ((SELECT id FROM cats WHERE name='Hambúrgueres artesanais'), 'X Tudo', 'Hambúrguer, queijo, ovo, salame, bacon, alface e tomate.', 42.90, NULL, 'MAIS PEDIDO', true, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/2898474/c29ff1b81106456658356274_1a1wy62.jpg', 1),
  ((SELECT id FROM cats WHERE name='Hambúrgueres artesanais'), 'Pork Burguer', 'Hambúrguer 100% bovino, lombo suíno desfiado ao barbecue, cheddar, cebola roxa, maionese verde, pão brioche.', 35.90, NULL, 'RECOMENDADO', true, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/2898475/3fc3b417bded806e-3f91-4a1d-af94-e94cf1432fdf.jpg', 2),
  ((SELECT id FROM cats WHERE name='Hambúrgueres artesanais'), 'X Salada', 'Hambúrguer artesanal, queijo prato, alface, tomate e pão.', 29.90, NULL, NULL, false, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/2898474/c29ff1b81106456658356274_1a1wy62.jpg', 3),
  ((SELECT id FROM cats WHERE name='Hambúrgueres artesanais'), 'X Bacon Salada', 'Hambúrguer, bacon, queijo, maionese, alface e tomate.', 34.90, NULL, NULL, false, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/2898475/3fc3b417bded806e-3f91-4a1d-af94-e94cf1432fdf.jpg', 4),
  ((SELECT id FROM cats WHERE name='Hambúrgueres artesanais'), 'Mega Picanha', 'Dois hambúrgueres com bacon, cebola roxa, cheddar, alface, tomate. Acompanha fritas.', 52.90, 59.90, NULL, false, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/2898474/c29ff1b81106456658356274_1a1wy62.jpg', 5),
  ((SELECT id FROM cats WHERE name='Combos do Marcão'), 'Trios Salada', 'Hambúrguer artesanal, queijo prato, salada, maionese caseira e uma bebida.', 44.90, NULL, NULL, true, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/2898510/d32bc9d21149211720443260_y4k7cp__1_.jpg', 1),
  ((SELECT id FROM cats WHERE name='Combos do Marcão'), 'Combo Master', 'Combo para duas pessoas: dois burguers, batata crocante com cheddar, 3 molhos e anéis de cebola.', 79.90, 83.90, NULL, false, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/2898510/d32bc9d21149211720443260_y4k7cp__1_.jpg', 2),
  ((SELECT id FROM cats WHERE name='Combos do Marcão'), 'Combo dos Namorados', 'Dois X Bacon Salada, fritas com bacon e cheddar, Coca 600ml e brownie com sorvete.', 119.90, NULL, 'RECOMENDADO', false, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/4367090/3d9689aaD10741BE-1B5F-4AFB-B0ED-5850AFC8CECF.jpeg', 3),
  ((SELECT id FROM cats WHERE name='Promoções'), '2 Hambúrgueres por R$46,90', 'Promoção válida somente na QUARTA-FEIRA.', 46.90, 59.90, 'RECOMENDADO', true, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/2937012/99a4eab4IMG_5548.jpeg', 1),
  ((SELECT id FROM cats WHERE name='Promoções'), 'Beirute de Contra Filé + Fritas', 'Beirute de contra filé acompanhado de fritas médias.', 79.90, 82.90, 'NOVIDADE', true, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/2937097/86f56b6b68cd729c-f242-4a77-9128-3dee1fba6b52.jpg', 2),
  ((SELECT id FROM cats WHERE name='Promoções'), 'Combo Dog Turbo', 'Hot dog turbo completo + fritas + bebida lata.', 35.90, 42.90, 'EDIÇÃO LIMITADA', true, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/3141899/aeb197f1IMG_3206.jpeg', 3),
  ((SELECT id FROM cats WHERE name='Hot Dogs'), 'Dogão Turbo', 'Duas salsichas, frango desfiado, calabresa, bacon, cheddar, catupiry, batata palha, vinagrete, milho e maionese.', 24.90, NULL, 'NOVIDADE', true, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/2955514/f65d6dcaIMG_2571.jpeg', 1),
  ((SELECT id FROM cats WHERE name='Hot Dogs'), 'Opção 2', 'Salsicha, milho, purê, batata palha, vinagrete, cheddar, catupiry, bacon e maionese.', 18.90, NULL, 'MAIS PEDIDO', true, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/2898526/c5da7b0aop.jpg', 2),
  ((SELECT id FROM cats WHERE name='Marmitex executiva'), 'Marmitex Executiva', 'Selecione a sua marmita favorita.', 24.90, NULL, 'RECOMENDADO', true, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/2910845/7cba524274fc5158-fbd1-453f-9a4b-45498a6c3173__1_.jpg', 1),
  ((SELECT id FROM cats WHERE name='Salgados fritos'), 'Kibe', NULL, 9.90, NULL, 'MAIS PEDIDO', false, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/3698322/11ddadddkibe.jpg', 1),
  ((SELECT id FROM cats WHERE name='Salgados fritos'), 'Coxinha', NULL, 9.90, NULL, NULL, false, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/3254107/921ba2ceMassa-de-coxinha.png', 2),
  ((SELECT id FROM cats WHERE name='Salgados fritos'), 'Bolinho de Queijo', NULL, 9.90, NULL, NULL, false, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/3254107/921ba2ceMassa-de-coxinha.png', 3),
  ((SELECT id FROM cats WHERE name='Salgados fritos'), 'Bolinho de Carne', NULL, 9.90, NULL, NULL, false, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/3254107/921ba2ceMassa-de-coxinha.png', 4),
  ((SELECT id FROM cats WHERE name='Salgados fritos'), 'Risole Presunto e Queijo', NULL, 9.90, NULL, NULL, false, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/3254107/921ba2ceMassa-de-coxinha.png', 5),
  ((SELECT id FROM cats WHERE name='Salgados fritos'), 'Pastel doce de leite', NULL, 14.90, 17.90, 'RECOMENDADO', false, 'https://storage.googleapis.com/prod-cardapio-web/uploads/item/image/4309641/4cd20bb6docinho.jpg', 6);
