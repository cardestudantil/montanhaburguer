ALTER TABLE public.store_info
ADD COLUMN IF NOT EXISTS require_neighborhood BOOLEAN NOT NULL DEFAULT true;