
CREATE OR REPLACE FUNCTION public.block_orders_when_closed()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  open_now BOOLEAN;
BEGIN
  SELECT is_open INTO open_now FROM public.store_info LIMIT 1;
  IF open_now IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'A loja está fechada. Pedidos não podem ser recebidos no momento.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_orders_when_closed ON public.orders;
CREATE TRIGGER trg_block_orders_when_closed
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.block_orders_when_closed();
