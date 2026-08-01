import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const getStoreMeta = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { name: null, tagline: null, logo_url: null };
  const client = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data } = await client.from("store_info").select("name,tagline,logo_url").limit(1).maybeSingle();
  return {
    name: data?.name ?? null,
    tagline: data?.tagline ?? null,
    logo_url: data?.logo_url ?? null,
  };
});
