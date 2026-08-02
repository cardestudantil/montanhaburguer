import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { myOrdersQuery } from "@/lib/queries";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/meus-pedidos")({
  ssr: false,
  head: () => ({ meta: [{ title: "Meus pedidos — Marcão Lanches" }] }),
  component: MyOrdersPage,
});

const BRL = (n: number) =>
  Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  out_for_delivery: "Saiu p/ entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-mustard text-background",
  confirmed: "bg-accent text-foreground",
  preparing: "bg-flame text-white",
  out_for_delivery: "bg-foreground text-background",
  delivered: "bg-success text-background",
  cancelled: "bg-destructive text-white",
};

const STATUS_ICON: Record<string, string> = {
  pending: "🕒",
  confirmed: "✅",
  preparing: "🍳",
  out_for_delivery: "🛵",
  delivered: "📦",
  cancelled: "❌",
};

const PAYMENT_ICON: Record<string, string> = {
  Pix: "⚡",
  "Cartão na entrega": "💳",
  Dinheiro: "💵",
};

const TIMELINE = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered"] as const;
const TIMELINE_LABEL: Record<(typeof TIMELINE)[number], string> = {
  pending: "Recebido",
  confirmed: "Confirmado",
  preparing: "Preparo",
  out_for_delivery: "A caminho",
  delivered: "Entregue",
};

const STORAGE_KEY = "marcao_my_orders";

type OrderEntry = { id: string; token: string };

function loadEntries(): OrderEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x): OrderEntry | null => {
        if (x && typeof x === "object" && "id" in x && "token" in x) {
          const id = String((x as { id: unknown }).id ?? "");
          const token = String((x as { token: unknown }).token ?? "");
          if (id && token) return { id, token };
        }
        return null;
      })
      .filter((v): v is OrderEntry => !!v);
  } catch {
    return [];
  }
}

type Addon = { name?: string; qty?: number; price?: number };
type OrderItem = Tables<"order_items"> & { addons?: Addon[] | unknown };
type MyOrder = Tables<"orders"> & { order_items: OrderItem[] };

function parseAddons(raw: unknown): Addon[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a): Addon | null => {
      if (a && typeof a === "object") {
        const o = a as Record<string, unknown>;
        return {
          name: typeof o.name === "string" ? o.name : undefined,
          qty: typeof o.qty === "number" ? o.qty : undefined,
          price: typeof o.price === "number" ? o.price : undefined,
        };
      }
      return null;
    })
    .filter((v): v is Addon => !!v);
}

function StatusTimeline({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
        ❌ Pedido cancelado
      </div>
    );
  }
  const currentIdx = TIMELINE.indexOf(status as (typeof TIMELINE)[number]);
  return (
    <ol className="flex items-center gap-1">
      {TIMELINE.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <li key={s} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-center gap-1">
              <div
                className={`grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-[10px] font-bold transition ${
                  active
                    ? "bg-flame text-white shadow-glow ring-2 ring-flame/30"
                    : done
                      ? "bg-success text-background"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              {i < TIMELINE.length - 1 && (
                <div
                  className={`h-0.5 flex-1 rounded ${
                    i < currentIdx ? "bg-success" : "bg-border"
                  }`}
                />
              )}
            </div>
            <span
              className={`text-[9px] font-medium leading-tight text-center ${
                active ? "text-flame" : done ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {TIMELINE_LABEL[s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function MyOrdersPage() {
  const [entries, setEntries] = useState<OrderEntry[]>([]);
  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  const q = useQuery(myOrdersQuery(entries));
  const orders = (q.data as MyOrder[] | undefined) ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-flame font-display text-lg text-white">
              M
            </div>
            <div className="font-display text-xl tracking-wide">Meus pedidos</div>
          </Link>
          <Link
            to="/"
            className="ml-auto rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:border-flame hover:text-foreground"
          >
            ← Cardápio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-secondary text-3xl">
              📋
            </div>
            <h2 className="font-display text-2xl tracking-wide">
              Você ainda não fez pedidos
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Quando você finalizar um pedido, ele aparece aqui pra acompanhar o status.
            </p>
            <Link
              to="/"
              className="mt-6 inline-block rounded-xl bg-flame px-5 py-3 font-semibold text-white shadow-glow"
            >
              Ir ao cardápio
            </Link>
          </div>
        ) : q.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Nenhum pedido encontrado.
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const orderNum = String(
                (o as unknown as { order_number?: number }).order_number ?? 0,
              ).padStart(2, "0");
              return (
                <article
                  key={o.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-border p-4">
                    <div className="font-display text-lg">Pedido #{orderNum}</div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        STATUS_COLOR[o.status] ?? ""
                      }`}
                    >
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </div>

                  <ul className="divide-y divide-border">
                    {(o.order_items ?? []).map((it) => {
                      const addons = parseAddons(it.addons);
                      return (
                        <li key={it.id} className="flex items-start gap-3 p-4">
                          <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-flame/10 text-xs font-bold text-flame">
                            {it.quantity}×
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-semibold">{it.name}</span>
                              <span className="whitespace-nowrap text-sm font-semibold">
                                {BRL(Number(it.line_total))}
                              </span>
                            </div>
                            {addons.length > 0 && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                <div className="font-semibold">Adicionais:</div>
                                <ul className="space-y-0.5">
                                  {addons.map((a, idx) => (
                                    <li key={idx}>
                                      {a.qty && a.qty > 1 ? `${a.qty}× ` : ""}
                                      {a.name ?? ""}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}


                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="flex items-center justify-between border-t border-border bg-background/40 p-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Pagamento
                      </div>
                      <div className="text-sm font-semibold">
                        {PAYMENT_ICON[o.payment_method ?? ""] ?? "•"}{" "}
                        {o.payment_method ?? "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Total
                      </div>
                      <div className="font-display text-xl text-flame">
                        {BRL(Number(o.total))}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

        )}
      </main>
    </div>
  );
}
