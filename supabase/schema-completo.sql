-- ============================================================
-- Esquema completo do app (rodar no SQL Editor do seu Supabase)
-- ============================================================

-- 1) TIPOS -----------------------------------------------------
do $$ begin
  create type public.app_role as enum ('admin','lanchonete','user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled');
exception when duplicate_object then null; end $$;

-- 2) FUNÇÕES AUXILIARES ---------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- 3) USER ROLES ------------------------------------------------
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
drop policy if exists "users read own roles" on public.user_roles;
create policy "users read own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','lanchonete'));
$$;

-- 4) STORE INFO ------------------------------------------------
create table if not exists public.store_info (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Marcão Lanches',
  tagline text,
  address text,
  phone text,
  hours text,
  delivery_fee numeric not null default 0,
  min_order numeric not null default 0,
  banner_url text,
  logo_url text,
  pix_key text,
  theme_color text,
  is_open boolean not null default true,
  require_neighborhood boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.store_info to anon;
grant select, insert, update, delete on public.store_info to authenticated;
grant all on public.store_info to service_role;
alter table public.store_info enable row level security;
drop policy if exists "store public read" on public.store_info;
create policy "store public read" on public.store_info for select to anon, authenticated using (true);
drop policy if exists "store staff write" on public.store_info;
create policy "store staff write" on public.store_info for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
drop trigger if exists store_info_updated on public.store_info;
create trigger store_info_updated before update on public.store_info
  for each row execute function public.set_updated_at();

-- 5) CATEGORIAS ------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon;
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
drop policy if exists "categories public read" on public.categories;
create policy "categories public read" on public.categories for select to anon, authenticated using (true);
drop policy if exists "categories staff write" on public.categories;
create policy "categories staff write" on public.categories for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- 6) ITENS DO CARDÁPIO ----------------------------------------
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price numeric not null default 0,
  old_price numeric,
  image_url text,
  tag text,
  featured boolean not null default false,
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.menu_items to anon;
grant select, insert, update, delete on public.menu_items to authenticated;
grant all on public.menu_items to service_role;
alter table public.menu_items enable row level security;
drop policy if exists "menu public read" on public.menu_items;
create policy "menu public read" on public.menu_items for select to anon, authenticated using (true);
drop policy if exists "menu staff write" on public.menu_items;
create policy "menu staff write" on public.menu_items for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
drop trigger if exists menu_items_updated on public.menu_items;
create trigger menu_items_updated before update on public.menu_items
  for each row execute function public.set_updated_at();

-- 7) ADICIONAIS POR ITEM --------------------------------------
create table if not exists public.menu_item_addons (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null,
  price numeric not null default 0,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.menu_item_addons to anon;
grant select, insert, update, delete on public.menu_item_addons to authenticated;
grant all on public.menu_item_addons to service_role;
alter table public.menu_item_addons enable row level security;
drop policy if exists "addons public read" on public.menu_item_addons;
create policy "addons public read" on public.menu_item_addons for select to anon, authenticated using (true);
drop policy if exists "addons staff write" on public.menu_item_addons;
create policy "addons staff write" on public.menu_item_addons for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- 8) ADICIONAIS POR CATEGORIA ---------------------------------
create table if not exists public.category_addons (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  price numeric not null default 0,
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);
grant select on public.category_addons to anon;
grant select, insert, update, delete on public.category_addons to authenticated;
grant all on public.category_addons to service_role;
alter table public.category_addons enable row level security;
drop policy if exists "Allow public read access for category_addons" on public.category_addons;
create policy "Allow public read access for category_addons" on public.category_addons for select using (true);
drop policy if exists "Allow staff to manage category_addons" on public.category_addons;
create policy "Allow staff to manage category_addons" on public.category_addons for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- 9) BAIRROS / TAXAS ------------------------------------------
create table if not exists public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fee numeric not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.neighborhoods to anon;
grant select, insert, update, delete on public.neighborhoods to authenticated;
grant all on public.neighborhoods to service_role;
alter table public.neighborhoods enable row level security;
drop policy if exists "neighborhoods public read" on public.neighborhoods;
create policy "neighborhoods public read" on public.neighborhoods for select to anon, authenticated using (true);
drop policy if exists "neighborhoods staff write" on public.neighborhoods;
create policy "neighborhoods staff write" on public.neighborhoods for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- 10) PEDIDOS --------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  client_token uuid not null default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  customer_address text,
  notes text,
  subtotal numeric not null default 0,
  delivery_fee numeric not null default 0,
  total numeric not null default 0,
  payment_method text,
  payment_proof_url text,
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant insert on public.orders to anon;
grant select, insert, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
drop policy if exists "orders public insert" on public.orders;
create policy "orders public insert" on public.orders for insert to anon, authenticated with check (true);
drop policy if exists "orders staff read" on public.orders;
create policy "orders staff read" on public.orders for select to authenticated using (public.is_staff(auth.uid()));
drop policy if exists "orders staff update" on public.orders;
create policy "orders staff update" on public.orders for update to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
drop policy if exists "orders staff delete" on public.orders;
create policy "orders staff delete" on public.orders for delete to authenticated using (public.is_staff(auth.uid()));
drop trigger if exists orders_updated on public.orders;
create trigger orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

-- 11) ITENS DO PEDIDO ------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name text not null,
  quantity integer not null default 1,
  unit_price numeric not null default 0,
  line_total numeric not null default 0,
  addons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
grant insert on public.order_items to anon;
grant select, insert, update, delete on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
drop policy if exists "order items public insert" on public.order_items;
create policy "order items public insert" on public.order_items for insert to anon, authenticated with check (true);
drop policy if exists "order items staff read" on public.order_items;
create policy "order items staff read" on public.order_items for select to authenticated using (public.is_staff(auth.uid()));
drop policy if exists "order items staff write" on public.order_items;
create policy "order items staff write" on public.order_items for update to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
drop policy if exists "order items staff delete" on public.order_items;
create policy "order items staff delete" on public.order_items for delete to authenticated using (public.is_staff(auth.uid()));

-- 12) STORAGE BUCKETS ------------------------------------------
insert into storage.buckets (id, name, public) values ('media','media',false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('payment-proofs','payment-proofs',false)
  on conflict (id) do nothing;

-- 13) DADOS INICIAIS -------------------------------------------
insert into public.store_info (name, tagline, is_open)
select 'Marcão Lanches', 'aplicativo teste', true
where not exists (select 1 from public.store_info);

-- 14) DAR ACESSO MASTER (troque pelo e-mail da sua conta) ------
-- insert into public.user_roles (user_id, role)
-- select id, 'admin' from auth.users where email = 'seu-email@exemplo.com'
-- on conflict do nothing;
