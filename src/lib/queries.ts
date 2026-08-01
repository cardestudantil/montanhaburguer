import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("position", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export const menuItemsQuery = queryOptions({
  queryKey: ["menu_items"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("position", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export const addonsQuery = queryOptions({
  queryKey: ["menu_item_addons"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("menu_item_addons")
      .select("*")
      .order("position", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export const storeInfoQuery = queryOptions({
  queryKey: ["store_info"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("store_info")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const neighborhoodsQuery = queryOptions({
  queryKey: ["neighborhoods"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("neighborhoods")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export const ordersQuery = queryOptions({
  queryKey: ["orders"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

import { getMyOrders } from "./my-orders.functions";

export const myOrdersQuery = (entries: { id: string; token: string }[]) => {
  const valid = entries.filter((e) => !!e.id && !!e.token);
  const key = valid
    .map((e) => `${e.id}:${e.token}`)
    .sort()
    .join(",");
  return queryOptions({
    queryKey: ["my_orders", key],
    enabled: valid.length > 0,
    refetchInterval: 15_000,
    queryFn: async () => {
      const data = await getMyOrders({
        data: {
          ids: valid.map((e) => e.id),
          tokens: valid.map((e) => e.token),
        },
      });
      return (data as unknown as Array<Record<string, unknown>>) ?? [];
    },
  });
};
