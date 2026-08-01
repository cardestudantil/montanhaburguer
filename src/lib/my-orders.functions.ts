import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
  tokens: z.array(z.string().uuid()).min(1).max(50),
});

export const getMyOrders = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    if (data.ids.length !== data.tokens.length) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*)")
      .in("id", data.ids);
    if (error) throw error;

    const tokenById = new Map<string, string>();
    data.ids.forEach((id, i) => tokenById.set(id, data.tokens[i]));

    const filtered = (orders ?? []).filter(
      (o) => tokenById.get(o.id) === o.client_token,
    );
    filtered.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    return filtered;
  });
