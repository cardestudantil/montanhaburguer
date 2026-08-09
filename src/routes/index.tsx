import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Lock, WifiOff, Trash2, ChevronLeft, ChevronRight } from "lucide-react";


import { supabase } from "@/integrations/supabase/client";
import { addonsQuery, categoriesQuery, menuItemsQuery, storeInfoQuery, categoryAddonsQuery } from "@/lib/queries";
import { toast, Toaster } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Index,
});

const BRL = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type SelectedAddon = { id: string; name: string; price: number; qty?: number };
type CartLine = { key: string; itemId: string; addons: SelectedAddon[]; notes: string; qty: number };

const addonQty = (a: SelectedAddon) => Math.max(1, Number(a.qty ?? 1));
const addonLabel = (a: SelectedAddon) => {
  const q = addonQty(a);
  return q > 1 ? `${q}x ${a.name}` : a.name;
};

const makeKey = (itemId: string, addons: SelectedAddon[], notes: string) =>
  itemId +
  "|" +
  addons
    .map((a) => `${a.id}:${addonQty(a)}`)
    .sort()
    .join(",") +
  "|" +
  notes.trim();

const addonsTotal = (addons: SelectedAddon[]) =>
  addons.reduce((s, a) => s + Number(a.price) * addonQty(a), 0);

function Index() {
  const items = useQuery(menuItemsQuery);
  const cats = useQuery(categoriesQuery);
  const store = useQuery(storeInfoQuery);
  const addons = useQuery(addonsQuery);
  const catAddons = useQuery(categoryAddonsQuery);

  const activeItems = useMemo(() => (items.data ?? []).filter((i) => i.active), [items.data]);
  const activeCats = useMemo(() => (cats.data ?? []).filter((c) => c.active && c.name !== "Promoções"), [cats.data]);
  const addonsByItem = useMemo(() => {
    const map: Record<string, Tables<"menu_item_addons">[]> = {};
    for (const a of addons.data ?? []) {
      if (!a.active) continue;
      (map[a.menu_item_id] ??= []).push(a);
    }
    return map;
  }, [addons.data]);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<Tables<"menu_items"> | null>(null);

  const addLine = (itemId: string, picked: SelectedAddon[], notes: string = "", qty: number = 1) => {
    const key = makeKey(itemId, picked, notes);
    setCart((c) => {
      const idx = c.findIndex((l) => l.key === key);
      if (idx >= 0) {
        const next = c.slice();
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...c, { key, itemId, addons: picked, notes, qty }];
    });
  };
  const incLine = (key: string) => setCart((c) => c.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l)));
  const decLine = (key: string) =>
    setCart((c) => c.flatMap((l) => (l.key !== key ? [l] : l.qty <= 1 ? [] : [{ ...l, qty: l.qty - 1 }])));

  const handleAdd = (item: Tables<"menu_items">) => {
    setDetailItem(item);
  };

  const currentCat = activeCat ?? activeCats[0]?.id ?? "";
  const filtered = useMemo(() => {
    if (!currentCat) return [];
    return activeItems.filter((i) => i.category_id === currentCat);
  }, [activeItems, currentCat]);

  const subtotal = cart.reduce((s, l) => {
    const it = activeItems.find((i) => i.id === l.itemId);
    return s + (Number(it?.price ?? 0) + addonsTotal(l.addons)) * l.qty;
  }, 0);
  const itemCount = cart.reduce((n, l) => n + l.qty, 0);
  const deliveryFee = subtotal > 0 ? Number(store.data?.delivery_fee ?? 0) : 0;

  const qtyOfItem = (id: string) => cart.filter((l) => l.itemId === id).reduce((n, l) => n + l.qty, 0);

  const isOnline = typeof window !== "undefined" ? window.navigator.onLine : true;

  if (store.isLoading || !store.data) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        {!isOnline && (
          <div className="fixed top-0 left-0 right-0 z-[9999] animate-in fade-in slide-in-from-top duration-300">
            <div className="flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-center text-xs font-bold text-white shadow-lg">
              <WifiOff className="h-3 w-3" />
              <span>Sem conexão com a internet. Suas alterações serão salvas assim que a rede voltar</span>
            </div>
          </div>
        )}
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-flame border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!isOnline && (
        <>
          <div className="fixed top-0 left-0 right-0 z-[9999] animate-in fade-in slide-in-from-top duration-300">
            <div className="flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-center text-xs font-bold text-white shadow-lg">
              <WifiOff className="h-3 w-3" />
              <span>Sem conexão com a internet. Suas alterações serão salvas assim que a rede voltar</span>
            </div>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `
            button[type="submit"], 
            button:has(svg.lucide-shopping-bag),
            button:has(svg.lucide-plus),
            .btn-critical { 
              pointer-events: none !important; 
              opacity: 0.6 !important; 
              cursor: not-allowed !important;
            }
          `}} />
        </>
      )}

      <Toaster theme="dark" position="top-center" />

      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 sm:flex sm:flex-wrap sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-flame font-display text-xl text-white shadow-glow">
              {store.data?.logo_url ? (
                <img src={store.data.logo_url} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                "M"
              )}
            </div>
            <div className="truncate font-display text-xl tracking-wide sm:text-2xl">
              {store.data?.name ?? "Marcão Lanches"}
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              to="/meus-pedidos"
              className="flex shrink-0 items-center gap-2 rounded-xl bg-flame px-4 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-flame/90"
            >
              <span>📋</span> Meus pedidos
            </Link>
            <Link
              to="/login"
              aria-label="Acesso restrito"
              title="Acesso restrito"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-flame hover:text-flame"
            >
              <Lock className="h-4 w-4" />
            </Link>
          </div>

        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-flame" />
        <img
          src={store.data?.banner_url || undefined}
          alt="Hambúrgueres"
          width={1920}
          height={768}
          className="h-[42vh] min-h-[280px] w-full object-cover opacity-70 md:h-[58vh]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-7xl px-4 pb-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end">
              <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl border-4 border-background bg-flame font-display text-4xl text-white shadow-card md:h-32 md:w-32 md:text-5xl">
                {store.data?.logo_url ? (
                  <img src={store.data.logo_url} alt="" className="h-full w-full rounded-xl object-cover" />
                ) : (
                  "M"
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <h1 className="break-words font-display text-4xl tracking-wide md:text-6xl">
                  {store.data?.tagline ? (
                    store.data.tagline
                  ) : (
                    <>
                      aplicativo teste
                    </>
                  )}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  {store.data?.is_open ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
                      <span className="font-semibold text-success">{store.data?.hours ?? "Aberto agora"}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-destructive" />
                      <span className="font-semibold text-destructive">Fechado</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="sticky top-16 z-20 -mx-4 mb-6 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-xl">
            <Carousel
              opts={{
                align: "start",
                dragFree: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2">
                {activeCats.map((c) => (
                  <CarouselItem key={c.id} className="basis-auto pl-2">
                    <CatPill active={currentCat === c.id} onClick={() => setActiveCat(c.id)}>
                      {c.name}
                    </CatPill>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>

          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-3xl tracking-wide">{activeCats.find((c) => c.id === currentCat)?.name}</h2>
            <span className="text-sm text-muted-foreground">{filtered.length} itens</span>
          </div>

          {items.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-card" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
              Nada por aqui.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  qty={qtyOfItem(item.id)}
                  hasAddons={(addonsByItem[item.id]?.length ?? 0) > 0}
                  onAdd={() => handleAdd(item)}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <CartCard
            cart={cart}
            items={activeItems}
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            itemCount={itemCount}
            onInc={incLine}
            onDec={decLine}
            onCheckout={() => setCheckoutOpen(true)}
          />
        </aside>
      </main>

      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-3 backdrop-blur-xl lg:hidden">
          <button
            onClick={() => setCheckoutOpen(true)}
            className="flex w-full items-center justify-between gap-3 rounded-xl bg-flame px-4 py-3 text-white shadow-glow"
          >
            <span className="min-w-0 truncate font-display text-lg tracking-wide">Finalizar · {itemCount}</span>
            <span className="shrink-0 font-bold">{BRL(subtotal + deliveryFee)}</span>
          </button>
        </div>
      )}

      {detailItem && (
        <ItemDetailsSheet
          item={detailItem}
          options={addonsByItem[detailItem.id] ?? []}
          categoryOptions={(catAddons.data ?? []).filter(a => a.category_id === detailItem.category_id && a.active)}
          onClose={() => setDetailItem(null)}
          onConfirm={(picked, notes, qty) => {
            addLine(detailItem.id, picked, notes, qty);
            setDetailItem(null);
          }}
        />
      )}

      {checkoutOpen && (
        <CheckoutModal
          cart={cart}
          items={activeItems}
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          onInc={incLine}
          onDec={decLine}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={() => {
            setCart([]);
            setCheckoutOpen(false);
          }}
        />
      )}

      <footer className="border-t border-border bg-card/40 py-10">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          <div className="font-display text-2xl tracking-wide text-foreground">
            {store.data?.name ?? "Marcão Lanches"}
          </div>
          {store.data?.address && (
            <div className="mt-1">
              {store.data.address} {store.data?.phone && `· ${store.data.phone}`}
            </div>
          )}
          <div className="mt-4 text-xs">© {new Date().getFullYear()} Todos os direitos reservados.</div>
          <Link to="/login" className="mt-3 inline-block text-xs text-muted-foreground/60 hover:text-flame">
            Acesso administrador
          </Link>
        </div>
      </footer>
    </div>
  );
}

function CatPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? "border-flame bg-flame text-white" : "border-border bg-card text-muted-foreground hover:border-flame/40 hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function ItemCard({
  item,
  qty,
  hasAddons,
  onAdd,
}: {
  item: Tables<"menu_items">;
  qty: number;
  hasAddons: boolean;
  onAdd: () => void;
}) {
  const tagColor: Record<string, string> = {
    "MAIS PEDIDO": "bg-flame text-white",
    RECOMENDADO: "bg-mustard text-background",
    NOVIDADE: "bg-success text-background",
    "EDIÇÃO LIMITADA": "bg-foreground text-background",
  };
  return (
    <article
      className="no-text-selection group relative flex cursor-pointer gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4 transition hover:border-flame/50 hover:shadow-card"
      onContextMenu={(event) => event.preventDefault()}
      onClick={onAdd}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAdd();
        }
      }}
    >
      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-secondary sm:h-32 sm:w-32">
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        {item.tag && (
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${tagColor[item.tag] ?? "bg-muted text-foreground"}`}
          >
            {item.tag}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="break-words font-display text-xl leading-tight tracking-wide">{item.name}</h3>
        {item.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            <div className="font-display text-lg tracking-wide text-flame">{BRL(Number(item.price))}</div>
            {item.old_price && (
              <div className="text-xs text-muted-foreground line-through">{BRL(Number(item.old_price))}</div>
            )}
            {hasAddons && (
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-mustard">+ Adicionais</div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="shrink-0 rounded-full bg-flame px-4 py-2 text-sm font-bold text-white shadow-glow hover:brightness-110"
          >
            {qty > 0 ? `+ Adicionar (${qty})` : "+ Adicionar"}
          </button>
        </div>
      </div>
    </article>
  );
}

function ItemDetailsSheet({
  item,
  options,
  categoryOptions = [],
  onClose,
  onConfirm,
}: {
  item: Tables<"menu_items">;
  options: Tables<"menu_item_addons">[];
  categoryOptions?: Tables<"category_addons">[];
  onClose: () => void;
  onConfirm: (picked: SelectedAddon[], notes: string, qty: number) => void;
}) {
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [itemQty, setItemQty] = useState(1);
  const setQty = (id: string, q: number) => setQtyMap((p) => ({ ...p, [id]: Math.max(0, q) }));

  const allAvailableAddons = [
    ...options.map(o => ({ ...o, type: 'item' })),
    ...categoryOptions.map(o => ({ ...o, type: 'category' }))
  ];

  const selected: SelectedAddon[] = allAvailableAddons
    .filter((o) => (qtyMap[o.id] ?? 0) > 0)
    .map((o) => ({ id: o.id, name: o.name, price: Number(o.price), qty: qtyMap[o.id] }));
  const unit = Number(item.price) + addonsTotal(selected);
  const total = unit * itemQty;
  const MAX = 150;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-card animate-in slide-in-from-bottom sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted sm:hidden" />
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="h-56 w-full object-cover" />
          ) : (
            <div className="grid h-40 w-full place-items-center bg-secondary text-6xl">🍨</div>
          )}
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <h3 className="font-display text-2xl tracking-wide">{item.name}</h3>
          <div className="mt-1 font-display text-xl text-flame">{BRL(Number(item.price))}</div>

          {item.description && (
            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-wide text-mustard">Ingredientes</div>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{item.description}</p>
            </div>
          )}

          {allAvailableAddons.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-bold uppercase tracking-wide text-mustard">Adicionais</div>
              <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
                {allAvailableAddons.map((o) => {
                  const q = qtyMap[o.id] ?? 0;
                  return (
                    <li key={o.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{o.name}</div>
                        <div className="text-xs font-bold text-flame">+ {BRL(Number(o.price))}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQty(o.id, q - 1)}
                          disabled={q <= 0}
                          aria-label={`Diminuir ${o.name}`}
                          className="grid h-8 w-8 place-items-center rounded-full border border-border text-lg font-bold disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-bold tabular-nums">{q}</span>
                        <button
                          type="button"
                          onClick={() => setQty(o.id, q + 1)}
                          aria-label={`Aumentar ${o.name}`}
                          className="grid h-8 w-8 place-items-center rounded-full bg-flame text-lg font-bold text-white"
                        >
                          +
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <label htmlFor="item-notes" className="text-xs font-bold uppercase tracking-wide text-mustard">
                Observações
              </label>
              <span className={`text-[11px] ${notes.length >= MAX ? "text-destructive" : "text-muted-foreground"}`}>
                {notes.length}/{MAX}
              </span>
            </div>
            <textarea
              id="item-notes"
              rows={3}
              maxLength={MAX}
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, MAX))}
              placeholder="Ex.: sem cebola, sem picles, ponto da carne..."
              className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-flame"
            />
          </div>
        </div>

        <div className="border-t border-border bg-card px-5 py-4 space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-2">
            <span className="text-xs font-bold uppercase tracking-wide text-mustard">Quantidade</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setItemQty((q) => Math.max(1, q - 1))}
                disabled={itemQty <= 1}
                aria-label="Diminuir"
                className="grid h-9 w-9 place-items-center rounded-full border border-border text-xl font-bold disabled:opacity-40"
              >
                −
              </button>
              <span className="w-8 text-center text-lg font-bold tabular-nums">{itemQty}</span>
              <button
                type="button"
                onClick={() => setItemQty((q) => Math.min(99, q + 1))}
                aria-label="Aumentar"
                className="grid h-9 w-9 place-items-center rounded-full bg-flame text-xl font-bold text-white"
              >
                +
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-xl border border-border bg-card text-destructive transition hover:bg-destructive/10"
              title="Excluir"
              aria-label="Excluir item"
            >
              <Trash2 className="h-6 w-6" />
            </button>
            <button
              onClick={() => onConfirm(selected, notes.trim(), itemQty)}
              className="flex flex-1 items-center justify-between gap-3 rounded-xl bg-flame px-4 py-3 font-display text-lg tracking-wide text-white shadow-glow hover:brightness-110"
            >
              <span>Adicionar {itemQty > 1 ? `${itemQty}x` : ""} ao carrinho</span>
              <span className="font-bold">{BRL(total)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartCard({
  cart,
  items,
  subtotal,
  deliveryFee,
  itemCount,
  onInc,
  onDec,
  onCheckout,
}: {
  cart: CartLine[];
  items: Tables<"menu_items">[];
  subtotal: number;
  deliveryFee: number;
  itemCount: number;
  onInc: (key: string) => void;
  onDec: (key: string) => void;
  onCheckout: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center gap-3 border-b border-border bg-secondary/40 px-5 py-4">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-flame text-white">🛍</div>
        <div>
          <div className="font-display text-xl tracking-wide">Sua sacola</div>
          <div className="text-xs text-muted-foreground">
            {itemCount === 0 ? "Vazia" : `${itemCount} ${itemCount === 1 ? "item" : "itens"}`}
          </div>
        </div>
      </div>
      <div className="max-h-[50vh] overflow-y-auto px-5 py-4">
        {cart.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-secondary text-2xl">🍨</div>
            Adicione itens pra montar seu pedido.
          </div>
        ) : (
          <ul className="space-y-3">
            {cart.map((l) => {
              const it = items.find((i) => i.id === l.itemId);
              if (!it) return null;
              const unit = Number(it.price) + addonsTotal(l.addons);
              return (
                <li key={l.key} className="flex items-start gap-3">
                  {it.image_url && (
                    <img src={it.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="break-words text-sm font-semibold">{it.name}</div>
                    {l.addons.length > 0 && (
                      <div className="text-[11px] text-mustard">
                        <div className="font-semibold">Adicionais:</div>
                        <ul>
                          {l.addons.map((a, i) => (
                            <li key={i}>{addonLabel(a)}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {l.notes && <div className="text-[11px] italic text-muted-foreground">Obs: {l.notes}</div>}

                    <div className="text-xs text-muted-foreground">{BRL(unit)} cada</div>
                    <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-border bg-background px-1">
                      <button
                        onClick={() => onDec(l.key)}
                        className="grid h-6 w-6 place-items-center rounded-full text-flame"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{l.qty}</span>
                      <button
                        onClick={() => onInc(l.key)}
                        className="grid h-6 w-6 place-items-center rounded-full text-flame"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-bold">{BRL(unit * l.qty)}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {cart.length > 0 && (
        <div className="border-t border-border px-5 py-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{BRL(subtotal)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Entrega</span>
            <span>{BRL(deliveryFee)}</span>
          </div>
          <div className="my-3 h-px bg-border" />
          <div className="flex justify-between">
            <span className="font-display tracking-wide">Total</span>
            <span className="font-display text-lg">{BRL(subtotal + deliveryFee)}</span>
          </div>
        </div>
      )}
      <div className="border-t border-border p-4">
        <button
          disabled={cart.length === 0}
          onClick={onCheckout}
          className="w-full rounded-xl bg-flame px-4 py-3 font-display text-lg tracking-wide text-white shadow-glow hover:brightness-110 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground disabled:shadow-none"
        >
          {cart.length === 0 ? "Sacola vazia" : "Finalizar pedido"}
        </button>
      </div>
    </div>
  );
}

function CheckoutModal({
  cart,
  items,
  subtotal,
  deliveryFee,
  onInc,
  onDec,
  onClose,
  onSuccess,
}: {
  cart: CartLine[];
  items: Tables<"menu_items">[];
  subtotal: number;
  deliveryFee: number;
  onInc: (key: string) => void;
  onDec: (key: string) => void;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const qc = useQueryClient();
  const store = useQuery(storeInfoQuery);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<{ id: string; name: string; fee: number } | null>(
    null,
  );
  const [nbSearch, setNbSearch] = useState("");
  const [nbDebounced, setNbDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setNbDebounced(nbSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [nbSearch]);
  const nbResults = useQuery({
    queryKey: ["neighborhoods_search", nbDebounced],
    enabled: nbDebounced.length >= 2 && !selectedNeighborhood,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("neighborhoods")
        .select("id,name,fee")
        .ilike("name", `%${nbDebounced}%`)
        .order("name", { ascending: true })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [step, setStep] = useState<"review" | "form">("review");
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    number: "",
    neighborhood_id: "",
    neighborhood_text: "",
    notes: "",
    payment_method: "Pix na entrega",
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [needsChange, setNeedsChange] = useState<null | boolean>(null);
  const [changeFor, setChangeFor] = useState<string>("");


  const effectiveFee = selectedNeighborhood ? Number(selectedNeighborhood.fee) : deliveryFee;

  const submit = useMutation({
    mutationFn: async () => {
      if (!store.data?.is_open) throw new Error("A loja está fechada no momento. Não é possível receber pedidos.");
      const total = subtotal + effectiveFee;
      const orderId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const clientToken = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const bairroPart = selectedNeighborhood
        ? `, ${selectedNeighborhood.name}`
        : form.neighborhood_text.trim()
          ? `, ${form.neighborhood_text.trim()}`
          : "";
      const fullAddress = `${form.customer_address.trim()}, nº ${form.number.trim()}${bairroPart}`;

      let proofPath: string | null = null;
      if (form.payment_method === "Pix") {
        // Legacy check - can be removed if Pix is completely gone from DB too
        if (!proofFile) throw new Error("Anexe o comprovante do Pix.");
      }

      let finalNotes = form.notes.trim();
      if (form.payment_method === "Dinheiro") {
        if (needsChange === true) {
          const paid = Number(changeFor);
          if (!changeFor || paid < total) throw new Error("Informe um valor de troco maior ou igual ao total.");
          const troco = paid - total;
          const trocoMsg = `Troco para ${paid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} (levar ${troco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de troco)`;
          finalNotes = finalNotes ? `${trocoMsg}. ${finalNotes}` : trocoMsg;
        } else if (needsChange === false) {
          finalNotes = finalNotes ? `Sem troco (valor exato). ${finalNotes}` : "Sem troco (valor exato)";
        }
      }

      const { error } = await supabase.from("orders").insert({
        id: orderId,
        client_token: clientToken,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        customer_address: fullAddress,
        notes: finalNotes || null,
        subtotal,
        delivery_fee: effectiveFee,
        total,
        payment_method: form.payment_method,
        payment_proof_url: proofPath,
      });

      if (error) throw error;
      const lines = cart.map((l) => {
        const it = items.find((i) => i.id === l.itemId)!;
        const unit = Number(it.price) + addonsTotal(l.addons);
        const nameWithAddons = l.notes ? `${it.name} — Obs: ${l.notes}` : it.name;


        return {
          order_id: orderId,
          menu_item_id: it.id,
          name: nameWithAddons,
          quantity: l.qty,
          unit_price: unit,
          line_total: unit * l.qty,
          addons: l.addons,
        };
      });
      const { error: e2 } = await supabase.from("order_items").insert(lines);
      if (e2) throw e2;
      try {
        const KEY = "marcao_my_orders";
        const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
        const prev: { id: string; token: string }[] = Array.isArray(raw)
          ? raw
              .map((x: unknown) => {
                if (typeof x === "string") return { id: x, token: "" };
                if (x && typeof x === "object" && "id" in x)
                  return {
                    id: String((x as { id: unknown }).id),
                    token: String((x as { token?: unknown }).token ?? ""),
                  };
                return null;
              })
              .filter((v): v is { id: string; token: string } => !!v && !!v.id)
          : [];
        const next = [{ id: orderId, token: clientToken }, ...prev.filter((x) => x.id !== orderId)];
        localStorage.setItem(KEY, JSON.stringify(next.slice(0, 50)));
      } catch {
        /* ignore */
      }
      return orderId;
    },
    onSuccess: () => {
      toast.success("Pedido enviado! Acompanhe em 'Meus pedidos'.");
      qc.invalidateQueries({ queryKey: ["orders"] });
      onSuccess();
    },
    onError: (e) => {
      setUploading(false);
      const msg =
        e instanceof Error
          ? e.message
          : (e as { message?: string } | null)?.message ?? "Erro ao enviar pedido";
      toast.error(msg);
    },
  });

  const pixKey = store.data?.pix_key;
  const copyPix = async () => {
    if (!pixKey) return;
    try {
      await navigator.clipboard.writeText(pixKey);
      toast.success("Chave Pix copiada");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const requireNb = (store.data as { require_neighborhood?: boolean } | null)?.require_neighborhood === true;

  const canReview = () => {
    if (
      !form.customer_name.trim() ||
      !form.customer_phone.trim() ||
      !form.customer_address.trim() ||
      !form.number.trim()
    )
      return false;
    if (requireNb && !form.neighborhood_id) return false;
    if (!requireNb && !form.neighborhood_text.trim()) return false;
    
    return true;
  };

  const total = subtotal + effectiveFee;
  const paymentIcon = form.payment_method.includes("Pix") ? "⚡" : form.payment_method === "Dinheiro" ? "💵" : "💳";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-card sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "review" ? (
          <>
            {/* 1. Cabeçalho */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-4 sm:px-6">
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                ← Voltar
              </button>
              <h3 className="font-display text-lg tracking-wide sm:text-2xl">Revisão do Pedido</h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
              {/* 2. Itens */}
              <section className="rounded-2xl border border-border bg-background/50 p-4">
                <h4 className="mb-3 font-display text-lg tracking-wide">Itens do pedido</h4>
                <ul className="space-y-3">
                  {cart.map((l) => {
                    const it = items.find((i) => i.id === l.itemId);
                    if (!it) return null;
                    const unit = Number(it.price) + addonsTotal(l.addons);
                    return (
                      <li key={l.key} className="flex items-start gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                          {it.image_url ? (
                            <img src={it.image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-2xl">🍨</div>
                          )}
                          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-flame text-[10px] font-bold text-white">
                            {l.qty}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="break-words text-sm font-semibold">{it.name}</div>
                          {l.addons.length > 0 && (
                            <div className="text-[11px] text-mustard">
                              <div className="font-semibold">Adicionais:</div>
                              <ul>
                                {l.addons.map((a, i) => (
                                  <li key={i}>{addonLabel(a)}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {l.notes && <div className="text-[11px] italic text-muted-foreground">Obs: {l.notes}</div>}
                          <div className="text-xs text-muted-foreground">{BRL(unit)} un.</div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="inline-flex items-center overflow-hidden rounded-full border border-border">
                              <button
                                type="button"
                                onClick={() => onDec(l.key)}
                                aria-label="Diminuir"
                                className="grid h-7 w-7 place-items-center text-sm font-bold text-foreground hover:bg-secondary"
                              >
                                −
                              </button>
                              <span className="min-w-[1.5rem] px-1 text-center text-xs font-bold">{l.qty}</span>
                              <button
                                type="button"
                                onClick={() => onInc(l.key)}
                                aria-label="Aumentar"
                                className="grid h-7 w-7 place-items-center text-sm font-bold text-foreground hover:bg-secondary"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                for (let i = 0; i < l.qty; i++) onDec(l.key);
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-destructive hover:bg-destructive/10"
                              aria-label="Remover item"
                              title="Remover item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="shrink-0 text-sm font-bold">{BRL(unit * l.qty)}</div>
                      </li>
                    );
                  })}
                </ul>
                {cart.length === 0 && (
                  <p className="mt-2 text-center text-sm text-muted-foreground">
                    Seu carrinho está vazio. Feche esta janela para adicionar itens.
                  </p>
                )}
              </section>

              {/* 3. Forma de pagamento */}
              <section className="rounded-2xl border border-border bg-background/50 p-4">
                <h4 className="mb-3 font-display text-lg tracking-wide">Opções de Pagamento</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "Pix na entrega", icon: "📱", label: "Pix na Entrega" },
                    { value: "Cartão na entrega", icon: "💳", label: "Cartão na Entrega" },
                    { value: "Dinheiro", icon: "💵", label: "Dinheiro" },
                  ].map((opt) => {
                    const selected = form.payment_method === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm({ ...form, payment_method: opt.value })}
                        className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-sm transition ${
                          selected
                            ? "border-flame bg-flame/10 font-semibold text-flame"
                            : "border-border bg-background hover:border-flame/50"
                        }`}
                      >
                        <span className="text-2xl">{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>


                {form.payment_method === "Dinheiro" && (
                  <div className="mt-3 space-y-3 rounded-xl border border-flame/40 bg-flame/5 p-4">
                    <div className="text-xs font-bold uppercase text-flame">Precisa de troco?</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setNeedsChange(false); setChangeFor(""); }}
                        className={`rounded-xl border-2 px-2 py-2 text-sm font-semibold transition ${
                          needsChange === false ? "border-flame bg-flame/10 text-flame" : "border-border bg-background hover:border-flame/50"
                        }`}
                      >
                        Não, valor exato
                      </button>
                      <button
                        type="button"
                        onClick={() => setNeedsChange(true)}
                        className={`rounded-xl border-2 px-2 py-2 text-sm font-semibold transition ${
                          needsChange === true ? "border-flame bg-flame/10 text-flame" : "border-border bg-background hover:border-flame/50"
                        }`}
                      >
                        Sim, preciso de troco
                      </button>
                    </div>
                    {needsChange === true && (
                      <div>
                        <label className="block text-xs font-semibold uppercase text-flame">
                          Troco para quanto? (Total: {BRL(subtotal + effectiveFee)})
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          value={changeFor}
                          onChange={(e) => setChangeFor(e.target.value)}
                          placeholder="Ex.: 50"
                          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                        {changeFor && Number(changeFor) >= subtotal + effectiveFee && (
                          <div className="mt-2 rounded-lg bg-success/10 px-3 py-2 text-sm font-semibold text-success">
                            Levar troco de {BRL(Number(changeFor) - (subtotal + effectiveFee))}
                          </div>
                        )}
                        {changeFor && Number(changeFor) < subtotal + effectiveFee && (
                          <div className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                            O valor deve ser maior ou igual ao total do pedido.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>


              {/* 4. Resumo de valores */}
              <section className="rounded-2xl border border-border bg-background/50 p-4">
                <h4 className="mb-3 font-display text-lg tracking-wide">Resumo</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd>{BRL(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Taxa de entrega</dt>
                    <dd>{BRL(effectiveFee)}</dd>
                  </div>
                  <div className="flex justify-between text-success">
                    <dt>Descontos</dt>
                    <dd>− {BRL(0)}</dd>
                  </div>
                  <div className="my-2 h-px bg-border" />
                  <div className="flex items-baseline justify-between">
                    <dt className="font-display text-lg tracking-wide">TOTAL</dt>
                    <dd className="font-display text-2xl tracking-wide text-flame">{BRL(total)}</dd>
                  </div>
                </dl>
                <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-semibold text-success">
                  ⏱ Entrega estimada 30-40 min
                </div>
              </section>
            </div>

            {/* Ação: avançar para dados */}
            <div className="sticky bottom-0 border-t border-border bg-card p-4">
              <button
                onClick={() => {
                  if (form.payment_method === "Pix" && !proofFile) {
                    toast.error("Anexe o comprovante do Pix para continuar.");
                    return;
                  }
                  if (form.payment_method === "Dinheiro") {
                    if (needsChange === null) {
                      toast.error("Informe se precisa de troco.");
                      return;
                    }
                    if (needsChange === true) {
                      const paid = Number(changeFor);
                      if (!changeFor || paid < total) {
                        toast.error("Informe um valor de troco maior ou igual ao total.");
                        return;
                      }
                    }
                  }

                  setStep("form");
                }}
                className="w-full rounded-xl bg-flame px-4 py-3 font-display text-lg tracking-wide text-white shadow-glow hover:brightness-110"
              >
                Continuar → Seus dados
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-4 sm:px-6">
              <button
                onClick={() => setStep("review")}
                disabled={submit.isPending || uploading}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
              >
                ← Voltar
              </button>
              <h3 className="font-display text-lg tracking-wide sm:text-2xl">Seus dados</h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (canReview()) submit.mutate();
              }}
              className="flex-1 space-y-3 overflow-y-auto p-6"
            >
              <input
                required
                placeholder="Seu nome completo"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-flame"
              />
              <input
                required
                placeholder="Telefone (WhatsApp)"
                value={form.customer_phone}
                onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-flame"
              />
              {requireNb && <div className="relative">
                <input
                  required={requireNb && !selectedNeighborhood}
                  placeholder={`Buscar bairro (frete)${requireNb ? " *" : " — opcional"} — digite 2 letras`}
                  value={selectedNeighborhood ? `${selectedNeighborhood.name} — ${BRL(Number(selectedNeighborhood.fee))}` : nbSearch}
                  onChange={(e) => {
                    if (selectedNeighborhood) {
                      setSelectedNeighborhood(null);
                      setForm({ ...form, neighborhood_id: "" });
                    }
                    setNbSearch(e.target.value);
                  }}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-flame"
                />
                {!selectedNeighborhood && nbDebounced.length >= 2 && (
                  <div className="mt-1 max-h-60 overflow-auto rounded-xl border border-border bg-background">
                    {nbResults.isLoading && (
                      <div className="px-4 py-2 text-xs text-muted-foreground">Buscando...</div>
                    )}
                    {!nbResults.isLoading && (nbResults.data ?? []).length === 0 && (
                      <div className="px-4 py-2 text-xs text-muted-foreground">
                        Nenhum bairro encontrado para "{nbDebounced}".
                      </div>
                    )}
                    {(nbResults.data ?? []).map((n) => (
                      <button
                        type="button"
                        key={n.id}
                        onClick={() => {
                          setSelectedNeighborhood({ id: n.id, name: n.name, fee: Number(n.fee) });
                          setForm({ ...form, neighborhood_id: n.id });
                          setNbSearch("");
                        }}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-secondary/60"
                      >
                        {n.name} — {BRL(Number(n.fee))}
                      </button>
                    ))}
                  </div>
                )}
                {!selectedNeighborhood && nbSearch.length > 0 && nbDebounced.length < 2 && (
                  <p className="mt-1 text-[11px] text-muted-foreground">Digite ao menos 2 letras para buscar.</p>
                )}
              </div>}
              {!requireNb && (
                <input
                  required
                  placeholder="Bairro *"
                  value={form.neighborhood_text}
                  onChange={(e) => setForm({ ...form, neighborhood_text: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-flame"
                />
              )}
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <textarea
                  required
                  rows={2}
                  placeholder="Endereço (rua, complemento)"
                  value={form.customer_address}
                  onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-flame"
                />
                <input
                  required
                  placeholder="Nº *"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-flame"
                />
              </div>
              <textarea
                rows={2}
                placeholder="Referências para o Motoboy (opcional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-flame"
              />

              <div className="rounded-xl border border-border bg-background/60 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pagamento</span>
                  <span>
                    {paymentIcon} {form.payment_method}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{BRL(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entrega</span>
                  <span>{BRL(effectiveFee)}</span>
                </div>
                <div className="mt-1 flex justify-between font-bold">
                  <span>Total</span>
                  <span>{BRL(total)}</span>
                </div>
              </div>

              {!store.data?.is_open && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-center text-sm font-semibold text-destructive">
                  🚫 A loja está fechada no momento. Pedidos serão aceitos quando reabrirmos.
                </div>
              )}
              <button
                type="submit"
                disabled={submit.isPending || uploading || !canReview() || !store.data?.is_open}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-flame px-4 py-4 font-display text-lg tracking-wide text-white shadow-glow hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {(submit.isPending || uploading) && (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {!store.data?.is_open
                  ? "Loja fechada"
                  : uploading
                    ? "Enviando comprovante..."
                    : submit.isPending
                      ? "Processando..."
                      : "Confirmar e Finalizar Pedido"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
