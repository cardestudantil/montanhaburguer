ALTER TABLE public.store_info ADD COLUMN IF NOT EXISTS pix_key text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_proof_url text;