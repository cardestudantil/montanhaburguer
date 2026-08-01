
DELETE FROM public.order_items;
DELETE FROM public.orders;

CREATE SEQUENCE IF NOT EXISTS public.orders_order_number_seq START WITH 1 INCREMENT BY 1;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number INTEGER NOT NULL DEFAULT nextval('public.orders_order_number_seq');

ALTER SEQUENCE public.orders_order_number_seq OWNED BY public.orders.order_number;
ALTER SEQUENCE public.orders_order_number_seq RESTART WITH 1;

GRANT USAGE, SELECT ON SEQUENCE public.orders_order_number_seq TO anon, authenticated, service_role;
