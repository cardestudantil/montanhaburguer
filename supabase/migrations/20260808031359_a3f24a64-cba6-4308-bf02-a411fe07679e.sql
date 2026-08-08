-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create category_addons table to link addons to categories
CREATE TABLE IF NOT EXISTS public.category_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_addons TO authenticated;
GRANT SELECT ON public.category_addons TO anon;
GRANT ALL ON public.category_addons TO service_role;

-- Enable RLS
ALTER TABLE public.category_addons ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access for category_addons"
ON public.category_addons FOR SELECT
USING (true);

CREATE POLICY "Allow staff to manage category_addons"
ON public.category_addons FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()));
