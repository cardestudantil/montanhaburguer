import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { addonsQuery, categoriesQuery, menuItemsQuery, storeInfoQuery, ordersQuery, neighborhoodsQuery } from "@/lib/queries";
import { useAuth } from "@/hooks/use-auth";
import { toast, Toaster } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { OrderPrint } from "@/components/OrderPrint";
import { useServerFn } from "@tanstack/react-start";
import { createStaffAccount, listStaffAccounts } from "@/lib/manage-accounts.functions";


export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Painel Admin — Burguer" }] }),
  component: AdminPage,
});

export type Tab = "items" | "categories" | "store" | "orders" | "clients" | "accounts";

const BRL = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function AdminPage() {
  const { user, isStaff, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("items");
  const { data: storeInfo } = useQuery(storeInfoQuery);
  const [storeName, setStoreName] = useState<string>("Burguer");
  useEffect(() => {
    try {
      const savedName = window.localStorage.getItem("store_name");
      if (savedName) setStoreName(savedName);
    } catch {}
  }, []);
  useEffect(() => {
    if (storeInfo?.name) {
      setStoreName(storeInfo.name);
      try {
        window.localStorage.setItem("store_name", storeInfo.name);
      } catch {}
    }
  }, [storeInfo?.name]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "store_name" && e.newValue) setStoreName(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (loading) return <FullPageMsg title="Carregando..." />;
  if (!user)
    return (
      <FullPageMsg
        title="Login necessário"
        body="nao funciona"
        action={
          <Link to="/login" className="rounded-xl bg-flame px-5 py-2 font-semibold text-white">
            Ir para login
          </Link>
        }
      />
    );
  if (!isStaff)
    return (
      <FullPageMsg
        title="Sem permissão"
        body="nao funciona"
        action={
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/login" });
            }}
            className="rounded-xl bg-flame px-5 py-2 font-semibold text-white"
          >
            Sair
          </button>
        }
      />
    );

  return (
    <div className="min-h-screen bg-background">
      <Toaster theme="dark" position="top-center" />
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-flame font-display text-lg text-white">
              M
            </div>
            <div>
              <div className="font-display text-lg tracking-wide leading-none">Painel Admin</div>
              <div className="text-[11px] text-muted-foreground">{storeName}</div>
            </div>
          </Link>
          <nav className="ml-6 hidden gap-1 md:flex">
            {(
              [
                ["items", "Cardápio"],
                ["categories", "Categorias"],
                ["store", "Loja"],
                ["orders", "Pedidos"],
                ["clients", "Clientes"],
                ["accounts", "Contas"],
              ] as [Tab, string][]
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  tab === k ? "bg-flame text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <StoreOpenToggle />
            <NewAccountButton />
            <span className="hidden text-xs text-muted-foreground md:inline">{user?.email}</span>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/login" });
              }}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:border-flame"
            >
              Sair
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {(
            [
              ["items", "Cardápio"],
              ["categories", "Categorias"],
              ["store", "Loja"],
              ["orders", "Pedidos"],
              ["clients", "Clientes"],
              ["accounts", "Contas"],
            ] as [Tab, string][]
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${tab === k ? "bg-flame text-white" : "bg-secondary text-muted-foreground"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {tab === "items" && <ItemsTab />}
        {tab === "categories" && <CategoriesTab />}
        {tab === "store" && <StoreTab />}
        {tab === "orders" && <OrdersTab isMaster={user?.email === "admin@app.com"} />}
        {tab === "clients" && <ClientsTab isMaster={user?.email === "admin@app.com"} />}
        {tab === "accounts" && <AccountsTab />}
      </main>
    </div>
  );
}

function NewAccountButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "lanchonete">("lanchonete");
  const createAccount = useServerFn(createStaffAccount);

  const mut = useMutation({
    mutationFn: () => createAccount({ data: { email, password, role } }),
    onSuccess: (res) => {
      toast.success(
        res.updated
          ? `Conta já existia — senha e perfil atualizados: ${res.email}`
          : `Conta criada: ${res.email}`,
      );

      setEmail("");
      setPassword("");
      setOpen(false);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível criar a conta"),
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:border-flame"
      >
        + Nova conta
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-2xl tracking-wide">Criar nova conta</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              O novo usuário entra pela tela de login com o e-mail e a senha definidos aqui.
            </p>

            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                mut.mutate();
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-flame"
              />
              <input
                type="text"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha (mín. 6 caracteres)"
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-flame"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "lanchonete")}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-flame"
              >
                <option value="lanchonete">Lanchonete (operador)</option>
                <option value="admin">Administrador</option>
              </select>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={mut.isPending}
                  className="flex-1 rounded-xl bg-flame px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {mut.isPending ? "Criando..." : "Criar conta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}


function FullPageMsg({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl tracking-wide">{title}</h1>
        {body && <p className="mt-2 text-sm text-muted-foreground">{body}</p>}
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}

function StoreOpenToggle() {
  const qc = useQueryClient();
  const { data: store } = useQuery(storeInfoQuery);
  const [busy, setBusy] = useState(false);
  const isOpen = !!store?.is_open;
  const toggle = async () => {
    if (!store) return;
    setBusy(true);
    const { error } = await supabase.from("store_info").update({ is_open: !isOpen }).eq("id", store.id);
    setBusy(false);
    if (error) {
      toast.error("Erro ao atualizar");
      return;
    }
    toast.success(!isOpen ? "Loja aberta" : "Loja fechada");
    qc.invalidateQueries({ queryKey: ["store_info"] });
  };
  return (
    <button
      onClick={toggle}
      disabled={busy || !store}
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
        isOpen
          ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
          : "bg-red-500/15 text-red-400 hover:bg-red-500/25"
      } disabled:opacity-50`}
      title="Clique para alternar"
    >
      <span className={`h-2 w-2 rounded-full ${isOpen ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
      {isOpen ? "Aberta" : "Fechada"}
    </button>
  );
}

/* =================================================== ITEMS =================================================== */

type Item = Tables<"menu_items">;
type Category = Tables<"categories">;

function ItemsTab() {
  const qc = useQueryClient();
  const items = useQuery(menuItemsQuery);
  const cats = useQuery(categoriesQuery);
  const [editing, setEditing] = useState<Partial<Item> | null>(null);

  const save = useMutation({
    mutationFn: async (i: Partial<Item>) => {
      const payload = {
        name: i.name!,
        description: i.description ?? null,
        price: Number(i.price ?? 0),
        old_price: i.old_price ? Number(i.old_price) : null,
        image_url: i.image_url ?? null,
        tag: i.tag ?? null,
        featured: !!i.featured,
        active: i.active ?? true,
        position: Number(i.position ?? 0),
        category_id: i.category_id ?? null,
      };
      if (i.id) {
        const { error } = await supabase.from("menu_items").update(payload).eq("id", i.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("menu_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu_items"] });
      setEditing(null);
      toast.success("Item salvo");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu_items"] });
      toast.success("Item removido");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: "active" | "featured"; value: boolean }) => {
      const patch = field === "active" ? { active: value } : { featured: value };
      const { error } = await supabase.from("menu_items").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu_items"] }),
  });

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-wide sm:text-3xl">Cardápio</h2>
          <p className="text-sm text-muted-foreground">{items.data?.length ?? 0} itens</p>
        </div>
        <button
          onClick={() => setEditing({ active: true, featured: false, position: 0 })}
          className="rounded-xl bg-flame px-4 py-2 text-sm font-semibold text-white shadow-glow hover:brightness-110 sm:text-base"
        >
          + Novo item
        </button>
      </div>

      {/* Mobile: cards */}
      <ul className="space-y-3 lg:hidden">
        {items.data?.map((i) => (
          <li key={i.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-start gap-3">
              {i.image_url && <img src={i.image_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{i.name}</div>
                <div className="text-xs text-muted-foreground">
                  {cats.data?.find((c) => c.id === i.category_id)?.name ?? "Sem categoria"}
                </div>
                {i.tag && <div className="mt-0.5 text-[10px] font-bold text-flame">{i.tag}</div>}
              </div>
              <div className="shrink-0 text-right">
                <div className="font-bold">{BRL(Number(i.price))}</div>
                {i.old_price && (
                  <div className="text-[11px] text-muted-foreground line-through">{BRL(Number(i.old_price))}</div>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={i.active} onChange={(v) => toggle.mutate({ id: i.id, field: "active", value: v })} />
                Ativo
              </label>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => setEditing(i)}
                  className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-flame"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Remover "${i.name}"?`)) del.mutate(i.id);
                  }}
                  className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-destructive"
                >
                  Excluir
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-border lg:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Item</th>
              <th className="p-3">Categoria</th>
              <th className="p-3">Preço</th>
              <th className="p-3">Ativo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.data?.map((i) => (
              <tr key={i.id} className="border-t border-border">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {i.image_url && <img src={i.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                    <div className="min-w-0">
                      <div className="font-semibold">{i.name}</div>
                      {i.tag && <div className="text-[10px] font-bold text-flame">{i.tag}</div>}
                    </div>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">
                  {cats.data?.find((c) => c.id === i.category_id)?.name ?? "—"}
                </td>
                <td className="p-3">
                  <div className="font-bold">{BRL(Number(i.price))}</div>
                  {i.old_price && (
                    <div className="text-xs text-muted-foreground line-through">{BRL(Number(i.old_price))}</div>
                  )}
                </td>
                <td className="p-3">
                  <Switch checked={i.active} onChange={(v) => toggle.mutate({ id: i.id, field: "active", value: v })} />
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => setEditing(i)} className="px-2 text-flame hover:underline">
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remover "${i.name}"?`)) del.mutate(i.id);
                    }}
                    className="px-2 text-destructive hover:underline"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Editar item" : "Novo item"}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(editing);
            }}
          >
            <Field label="Nome">
              <input
                required
                value={editing.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Descrição">
              <textarea
                rows={3}
                value={editing.description ?? ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Preço (R$)">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editing.price ?? ""}
                  onChange={(e) => setEditing({ ...editing, price: e.target.value as unknown as number })}
                  className={inputCls}
                />
              </Field>
              <Field label="Preço antigo (opcional)">
                <input
                  type="number"
                  step="0.01"
                  value={editing.old_price ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, old_price: (e.target.value ? e.target.value : null) as unknown as number })
                  }
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Categoria">
              <select
                value={editing.category_id ?? ""}
                onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })}
                className={inputCls}
              >
                <option value="">Sem categoria</option>
                {cats.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Foto do item">
              <ImageInput
                value={editing.image_url ?? ""}
                onChange={(url) => setEditing((prev) => ({ ...(prev ?? {}), image_url: url }))}
                folder="menu"
              />
            </Field>
            <Field label="Tag (opcional)">
              <select
                value={editing.tag ?? ""}
                onChange={(e) => setEditing({ ...editing, tag: e.target.value || null })}
                className={inputCls}
              >
                <option value="">Nenhuma</option>
                <option>MAIS PEDIDO</option>
                <option>RECOMENDADO</option>
                <option>NOVIDADE</option>
                <option>EDIÇÃO LIMITADA</option>
              </select>
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Posição">
                <input
                  type="number"
                  value={editing.position ?? 0}
                  onChange={(e) => setEditing({ ...editing, position: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <div className="flex flex-wrap items-end gap-4 pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!editing.active}
                    onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  />
                  Ativo
                </label>
              </div>
            </div>
            {editing.id ? (
              <AddonsManager itemId={editing.id} />
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
                💡 Salve o item primeiro para cadastrar os adicionais.
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-xl border border-border px-4 py-2"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={save.isPending}
                className="rounded-xl bg-flame px-5 py-2 font-semibold text-white"
              >
                {save.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

/* =============================================== CATEGORIES =============================================== */

function CategoriesTab() {
  const qc = useQueryClient();
  const cats = useQuery(categoriesQuery);
  const [editing, setEditing] = useState<Partial<Category> | null>(null);

  const save = useMutation({
    mutationFn: async (c: Partial<Category>) => {
      const payload = { name: c.name!, position: Number(c.position ?? 0), active: c.active ?? true };
      if (c.id) {
        const { error } = await supabase.from("categories").update(payload).eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setEditing(null);
      toast.success("Categoria salva");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria removida");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-wide sm:text-3xl">Categorias</h2>
          <p className="text-sm text-muted-foreground">{cats.data?.length ?? 0} categorias</p>
        </div>
        <button
          onClick={() => setEditing({ active: true, position: (cats.data?.length ?? 0) + 1 })}
          className="rounded-xl bg-flame px-4 py-2 text-sm font-semibold text-white sm:text-base"
        >
          + Nova categoria
        </button>
      </div>

      <ul className="space-y-2 sm:hidden">
        {cats.data?.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{c.name}</div>
              <div className="text-xs text-muted-foreground">
                Posição {c.position} · {c.active ? "Ativo" : "Inativo"}
              </div>
            </div>
            <button
              onClick={() => setEditing(c)}
              className="shrink-0 rounded-lg border border-border px-3 py-1 text-xs font-semibold text-flame"
            >
              Editar
            </button>
            <button
              onClick={() => {
                if (confirm(`Remover "${c.name}"?`)) del.mutate(c.id);
              }}
              className="shrink-0 rounded-lg border border-border px-3 py-1 text-xs font-semibold text-destructive"
            >
              Excluir
            </button>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-2xl border border-border sm:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Posição</th>
              <th className="p-3">Ativo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cats.data?.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-semibold">{c.name}</td>
                <td className="p-3 text-muted-foreground">{c.position}</td>
                <td className="p-3">{c.active ? "Sim" : "Não"}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => setEditing(c)} className="px-2 text-flame hover:underline">
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remover "${c.name}"?`)) del.mutate(c.id);
                    }}
                    className="px-2 text-destructive hover:underline"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Editar categoria" : "Nova categoria"}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(editing);
            }}
          >
            <Field label="Nome">
              <input
                required
                value={editing.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Posição">
              <input
                type="number"
                value={editing.position ?? 0}
                onChange={(e) => setEditing({ ...editing, position: Number(e.target.value) })}
                className={inputCls}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!editing.active}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              />
              Ativo
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-xl border border-border px-4 py-2"
              >
                Cancelar
              </button>
              <button type="submit" className="rounded-xl bg-flame px-5 py-2 font-semibold text-white">
                Salvar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

/* =================================================== STORE =================================================== */

function StoreTab() {
  const qc = useQueryClient();
  const store = useQuery(storeInfoQuery);
  const [form, setForm] = useState<Partial<Tables<"store_info">>>({});

  useEffect(() => {
    if (store.data) setForm(store.data);
  }, [store.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!store.data) return;
      const payload = {
        name: form.name!,
        tagline: form.tagline ?? null,
        address: form.address ?? null,
        phone: form.phone ?? null,
        hours: form.hours ?? null,
        delivery_fee: Number(form.delivery_fee ?? 0),
        min_order: Number(form.min_order ?? 0),
        banner_url: form.banner_url ?? null,
        logo_url: form.logo_url ?? null,
        is_open: form.is_open ?? true,
        pix_key: form.pix_key ?? null,
        require_neighborhood: (form as { require_neighborhood?: boolean }).require_neighborhood ?? true,
        theme_color: (form as { theme_color?: string | null }).theme_color ?? null,
      };

      const { error } = await supabase.from("store_info").update(payload).eq("id", store.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store_info"] });
      toast.success("Informações da loja salvas");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <section className="max-w-3xl">
      <h2 className="mb-6 font-display text-3xl tracking-wide">Informações da loja</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-4 rounded-2xl border border-border bg-card p-6"
      >
        <Field label="Nome da loja">
          <input
            required
            value={form.name ?? ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Slogan">
          <input
            value={form.tagline ?? ""}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Endereço">
          <input
            value={form.address ?? ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Telefone">
            <input
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Horário">
            <input
              value={form.hours ?? ""}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
              className={inputCls}
              placeholder="Aberto até às 22h45"
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Taxa de entrega (R$)">
            <input
              type="number"
              step="0.01"
              value={form.delivery_fee ?? 0}
              onChange={(e) => setForm({ ...form, delivery_fee: Number(e.target.value) })}
              className={inputCls}
            />
          </Field>
          <Field label="Pedido mínimo (R$)">
            <input
              type="number"
              step="0.01"
              value={form.min_order ?? 0}
              onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Banner">
          <ImageInput
            value={form.banner_url ?? ""}
            onChange={(url) => setForm({ ...form, banner_url: url })}
            folder="store"
          />
        </Field>
        <Field label="Logo">
          <ImageInput
            value={form.logo_url ?? ""}
            onChange={(url) => setForm({ ...form, logo_url: url })}
            folder="store"
          />
        </Field>
        <Field label="Chave Pix">
          <input
            value={form.pix_key ?? ""}
            onChange={(e) => setForm({ ...form, pix_key: e.target.value })}
            className={inputCls}
            placeholder="CPF, telefone, e-mail ou chave aleatória"
          />
        </Field>
        <Field label="Cor do aplicativo">
          <ThemeColorPicker
            value={(form as { theme_color?: string | null }).theme_color ?? ""}
            onChange={(v) =>
              setForm({ ...(form as Partial<Tables<"store_info">>), theme_color: v } as Partial<Tables<"store_info">>)
            }
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!form.is_open}
            onChange={(e) => setForm({ ...form, is_open: e.target.checked })}
          />
          Loja aberta agora
        </label>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-xl bg-flame px-6 py-3 font-display tracking-wide text-white shadow-glow"
          >
            {save.isPending ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>

      <NeighborhoodsSection />
    </section>
  );
}

/* =================================== FRETE POR BAIRRO =================================== */

function NeighborhoodsSection() {
  const qc = useQueryClient();
  const store = useQuery(storeInfoQuery);
  const [name, setName] = useState("");
  const [fee, setFee] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [search]);
  const list = useQuery(neighborhoodsQuery);
  const allNb = (list.data ?? []) as Array<Tables<"neighborhoods">>;
  const filtered = allNb.filter((n) =>
    debounced.length === 0 ? true : n.name.toLowerCase().includes(debounced),
  );

  const requireNb = (store.data as { require_neighborhood?: boolean } | null)?.require_neighborhood ?? true;

  const toggleRequire = useMutation({
    mutationFn: async (value: boolean) => {
      if (!store.data) return;
      const { error } = await supabase
        .from("store_info")
        .update({ require_neighborhood: value } as never)
        .eq("id", store.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store_info"] });
      toast.success("Preferência salva");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const add = useMutation({
    mutationFn: async () => {
      const n = name.trim();
      const f = Number(String(fee).replace(",", "."));
      if (!n) throw new Error("Informe o nome do bairro");
      if (!isFinite(f) || f < 0) throw new Error("Valor de frete inválido");
      const { error } = await supabase.from("neighborhoods").insert({ name: n, fee: f });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setFee("");
      qc.invalidateQueries({ queryKey: ["neighborhoods"] });
      toast.success("Bairro adicionado");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("neighborhoods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["neighborhoods"] });
      toast.success("Bairro removido");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const updateFee = useMutation({
    mutationFn: async ({ id, fee }: { id: string; fee: number }) => {
      const { error } = await supabase.from("neighborhoods").update({ fee }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["neighborhoods"] });
      toast.success("Frete atualizado");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const startEdit = (id: string, current: number) => {
    setEditingId(id);
    setEditValue(String(current).replace(".", ","));
  };
  const saveEdit = (id: string) => {
    const f = Number(String(editValue).replace(",", "."));
    if (!isFinite(f) || f < 0) {
      toast.error("Valor inválido");
      return;
    }
    updateFee.mutate({ id, fee: f }, { onSuccess: () => setEditingId(null) });
  };

  return (
    <div className="mt-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-2xl tracking-wide">Frete por bairro</h3>
        <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-2 text-sm">
          <span className="font-medium">Exigir bairro no checkout</span>
          <input
            type="checkbox"
            checked={requireNb}
            disabled={toggleRequire.isPending}
            onChange={(e) => toggleRequire.mutate(e.target.checked)}
            className="h-4 w-4 accent-flame"
          />
          <span className="text-xs text-muted-foreground">{requireNb ? "Obrigatório" : "Opcional"}</span>
        </label>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
        className="mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Nome do bairro</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Centro"
            className={inputCls}
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Valor do frete (R$)</label>
          <input
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          disabled={add.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background hover:brightness-110 disabled:opacity-60"
        >
          + Adicionar
        </button>
      </form>

      <div className="mb-3">
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">
          Buscar bairro (digite ao menos 3 letras)
        </label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ex: cen"
          className={inputCls}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Bairro</th>
              <th className="px-4 py-3 text-right">Frete</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((n) => {
              const isEditing = editingId === n.id;
              return (
                <tr key={n.id} className="border-t border-border">
                  <td className="px-4 py-3">{n.name}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(n.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        inputMode="decimal"
                        className="w-24 rounded-lg border border-flame bg-background px-2 py-1 text-right text-sm outline-none"
                      />
                    ) : (
                      BRL(Number(n.fee))
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => saveEdit(n.id)}
                            disabled={updateFee.isPending}
                            className="inline-flex h-8 items-center rounded-lg border border-flame bg-flame px-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex h-8 items-center rounded-lg border border-border px-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(n.id, Number(n.fee))}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-flame hover:text-flame"
                          aria-label="Editar frete"
                        >
                          ✏️
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Remover o bairro "${n.name}"?`)) remove.mutate(n.id);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-flame hover:text-flame"
                        aria-label="Remover"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  {list.isLoading
                    ? "Carregando..."
                    : debounced.length > 0
                      ? `Nenhum bairro encontrado para "${debounced}".`
                      : "Nenhum bairro cadastrado ainda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PRESET_COLORS = [
  "#ef4444", // vermelho (padrão)
  "#f97316", // laranja
  "#f59e0b", // âmbar
  "#eab308", // amarelo
  "#22c55e", // verde
  "#10b981", // esmeralda
  "#06b6d4", // ciano
  "#3b82f6", // azul
  "#6366f1", // índigo
  "#8b5cf6", // roxo
  "#ec4899", // rosa
  "#111827", // preto
];

function ThemeColorPicker({ value, onChange }: { value: string; onChange: (v: string | null) => void }) {
  const current = value || "";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`h-9 w-9 rounded-full border-2 transition ${
              current.toLowerCase() === c.toLowerCase() ? "border-foreground scale-110" : "border-border"
            }`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(current) ? current : "#ef4444"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent"
        />
        <input
          value={current}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="#ef4444"
          className={inputCls}
        />
        {current && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:border-flame hover:text-flame"
          >
            Padrão
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Escolha uma cor pronta ou informe um código hexadecimal. A cor é aplicada em botões, destaques e realces.
      </p>
    </div>
  );
}

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

import notifySoundAsset from "@/assets/notify.mp3.asset.json";

function useNewOrderSound(orders: Tables<"orders">[] | undefined, enabled: boolean, volume: number) {
  const knownIds = useRef<Set<string> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const loadingRef = useRef<Promise<AudioBuffer | null> | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const volumeRef = useRef(volume);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const getCtx = () => {
    try {
      const AC =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") audioCtxRef.current = new AC();
      return audioCtxRef.current;
    } catch {
      return null;
    }
  };

  const ensureCtx = async () => {
    const ctx = getCtx();
    if (!ctx) return null;
    if (ctx.state === "suspended") await ctx.resume();
    return ctx;
  };

  const loadBuffer = async (ctx: AudioContext) => {
    if (bufferRef.current) return bufferRef.current;
    if (!loadingRef.current) {
      loadingRef.current = (async () => {
        try {
          const res = await fetch(notifySoundAsset.url);
          const arr = await res.arrayBuffer();
          const buf = await ctx.decodeAudioData(arr);
          bufferRef.current = buf;
          return buf;
        } catch {
          return null;
        }
      })();
    }
    return loadingRef.current;
  };

  const stopBeep = () => {
    const src = activeSourceRef.current;
    if (src) {
      try {
        src.stop();
      } catch {
        // ignore
      }
      try {
        src.disconnect();
      } catch {
        // ignore
      }
      activeSourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const playSequence = async () => {
    const ctx = await ensureCtx();
    if (!ctx || ctx.state !== "running") return false;
    const buffer = await loadBuffer(ctx);
    if (!buffer) return false;

    // Stop any previous playback so we don't stack loops
    stopBeep();

    // Master chain: gain -> soft-clip -> limiter -> post gain -> destination
    const master = ctx.createGain();
    master.gain.value = Math.max(0, volumeRef.current);
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 512) - 1;
      curve[i] = Math.tanh(x * 3);
    }
    shaper.curve = curve;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -1;
    comp.knee.value = 2;
    comp.ratio.value = 20;
    comp.attack.value = 0.001;
    comp.release.value = 0.12;
    const postGain = ctx.createGain();
    postGain.gain.value = 1.5;
    master.connect(shaper).connect(comp).connect(postGain).connect(ctx.destination);

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(master);
    src.start(ctx.currentTime + 0.02);
    activeSourceRef.current = src;
    setIsPlaying(true);
    return true;
  };

  const playBeep = playSequence;



  // Prime audio on first user interaction anywhere on page
  useEffect(() => {
    const prime = () => {
      void ensureCtx();
    };
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, []);

  useEffect(() => {
    if (!orders) return;
    const ids = new Set(orders.map((o) => o.id));
    if (knownIds.current === null) {
      knownIds.current = ids;
      return;
    }
    const fresh = orders.filter((o) => !knownIds.current!.has(o.id));
    if (fresh.length > 0) {
      if (enabled) void playBeep();
      toast.success(`🔔 ${fresh.length} novo${fresh.length > 1 ? "s" : ""} pedido${fresh.length > 1 ? "s" : ""}!`);
    }
    knownIds.current = ids;
  }, [orders, enabled]);

  return { playBeep, stopBeep, ensureCtx, isPlaying };
}


function useWakeLock(enabled: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> } };
    if (!nav.wakeLock) return;

    const acquire = async () => {
      try {
        if (document.visibilityState !== "visible") return;
        if (lockRef.current) return;
        const lock = await nav.wakeLock!.request("screen");
        lockRef.current = lock;
        setActive(true);
        lock.addEventListener("release", () => {
          lockRef.current = null;
          setActive(false);
        });
      } catch {
        setActive(false);
      }
    };

    void acquire();
    const onVis = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
      setActive(false);
    };
  }, [enabled]);

  return active;
}

function OrdersTab({ isMaster = false }: { isMaster?: boolean }) {
  const qc = useQueryClient();
  const orders = useQuery({ ...ordersQuery, refetchInterval: 10_000 });
  const [soundOn, setSoundOn] = useState(true);
  const [keepAwake, setKeepAwake] = useState(true);
  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") return 16;
    const v = Number(window.localStorage.getItem("admin-sound-volume"));
    return Number.isFinite(v) && v > 0 ? v : 16;
  });


  useEffect(() => {
    try {
      window.localStorage.setItem("admin-sound-volume", String(volume));
    } catch {}
  }, [volume]);
  const [printOrder, setPrintOrder] = useState<
    (Tables<"orders"> & { order_items?: Tables<"order_items">[] }) | null
  >(null);

  const wakeActive = useWakeLock(keepAwake);
  const { playBeep, stopBeep, ensureCtx, isPlaying } = useNewOrderSound(orders.data, soundOn, volume);


  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: status as Tables<"orders">["status"] })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Status atualizado");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("order_items").delete().eq("order_id", id);
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Pedido excluído");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-wide sm:text-3xl">Pedidos</h2>
          <p className="text-sm text-muted-foreground">{orders.data?.length ?? 0} pedidos · atualiza a cada 10s</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={async () => {
              const played = await playBeep();
              if (played) toast.success("Som funcionando");
              else toast.error("Toque/click de novo: o navegador bloqueou o áudio");
            }}
            className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-flame hover:text-foreground sm:text-sm"
          >
            🔊 Testar som
          </button>
          {isPlaying && (
            <button
              onClick={stopBeep}
              className="animate-pulse rounded-xl border-2 border-flame bg-flame px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-flame/90 sm:text-sm"
            >
              🔕 Parar som
            </button>
          )}

          <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground sm:text-sm">
            <span>Volume</span>
            <input
              type="range"
              min={0}
              max={20}
              step={0.5}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="h-1 w-24 cursor-pointer accent-flame"
            />
            <span className="tabular-nums text-foreground">{Math.round((volume / 20) * 100)}%</span>


          </label>

          <button
            onClick={() => {
              void ensureCtx();
              setSoundOn((v) => !v);
            }}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition sm:text-sm ${soundOn ? "border-flame bg-flame/10 text-flame" : "border-border text-muted-foreground"}`}
          >
            {soundOn ? "🔔 Som ativado" : "🔕 Som desativado"}
          </button>
          <button
            onClick={() => setKeepAwake((v) => !v)}
            title="Impede o celular de apagar a tela enquanto o painel está aberto"
            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition sm:text-sm ${keepAwake ? "border-flame bg-flame/10 text-flame" : "border-border text-muted-foreground"}`}
          >
            {keepAwake ? (wakeActive ? "📱 Tela sempre ligada" : "📱 Manter tela ligada") : "💤 Tela pode apagar"}
          </button>
        </div>
      </div>

      {orders.data?.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          Nenhum pedido recebido ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.data?.map((o) => (
            <details key={o.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 p-3 sm:p-4">
                <div
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_COLOR[o.status] ?? ""}`}
                >
                  {STATUS_LABEL[o.status] ?? o.status}
                </div>
                <div className="shrink-0 rounded-full bg-flame/10 px-2.5 py-0.5 font-display text-sm font-bold text-flame">
                  #{String((o as unknown as { order_number?: number }).order_number ?? 0).padStart(2, "0")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{o.customer_name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("pt-BR")} · {o.customer_phone}
                  </div>
                </div>
                <div className="font-display text-base sm:text-lg">{BRL(Number(o.total))}</div>
                {isMaster && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (window.confirm(`Excluir o pedido #${String((o as unknown as { order_number?: number }).order_number ?? 0).padStart(2, "0")} de ${o.customer_name}? Esta ação não pode ser desfeita.`)) {
                        deleteOrder.mutate(o.id);
                      }
                    }}
                    className="shrink-0 rounded-full border border-red-500/60 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-500 hover:text-white"
                    title="Excluir pedido"
                  >
                    🗑
                  </button>
                )}
              </summary>
              <div className="border-t border-border bg-background/40 p-3 text-sm sm:p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Entrega</div>
                    <div className="break-words">{o.customer_address}</div>
                    {o.notes && (
                      <>
                        <div className="mt-2 text-xs uppercase text-muted-foreground">Observações</div>
                        <div className="break-words">{o.notes}</div>
                      </>
                    )}
                    {o.payment_method && (
                      <div className="mt-2 inline-flex items-center gap-2 rounded-md border-2 border-primary bg-primary/15 px-3 py-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-primary">Pagamento</span>
                        <span className="text-sm font-bold text-foreground">{o.payment_method}</span>
                      </div>
                    )}
                    {o.payment_proof_url && <ProofLink path={o.payment_proof_url} />}
                  </div>

                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Itens</div>
                    <ul className="mt-1 space-y-1">
                      {(o as unknown as { order_items: Tables<"order_items">[] }).order_items?.map((it) => {
                        const ads = Array.isArray((it as unknown as { addons?: unknown }).addons)
                          ? ((it as unknown as { addons: Array<{ name?: string; qty?: number }> }).addons)
                          : [];
                        return (
                          <li key={it.id} className="space-y-1">
                            <div className="flex justify-between gap-2">
                              <span className="min-w-0 break-words font-medium">
                                {it.quantity}× {it.name}
                              </span>
                              <span className="shrink-0">{BRL(Number(it.line_total))}</span>
                            </div>
                            {ads.length > 0 && (
                              <div className="ml-4 rounded-md border-l-2 border-primary/60 bg-primary/5 px-2 py-1">
                                <div className="text-[10px] font-bold uppercase tracking-wide text-primary">
                                  [anexo]
                                </div>
                                <ul className="mt-0.5 space-y-0.5 text-sm">
                                  {ads.map((a, i) => (
                                    a?.name ? (
                                      <li key={i} className="text-foreground">
                                        + {a.qty && Number(a.qty) > 1 ? `${a.qty}× ` : ""}
                                        {a.name}
                                      </li>
                                    ) : null
                                  ))}
                                </ul>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                      <span>Entrega</span>
                      <span>{BRL(Number(o.delivery_fee))}</span>
                    </div>
                    <div className="mt-1 flex justify-between font-bold">
                      <span>Total</span>
                      <span>{BRL(Number(o.total))}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(STATUS_LABEL).map(([k, l]) => (
                    <button
                      key={k}
                      disabled={o.status === k}
                      onClick={() => setStatus.mutate({ id: o.id, status: k })}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${o.status === k ? "bg-flame text-white" : "border border-border hover:border-flame"}`}
                    >
                      {l}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setPrintOrder(
                        o as unknown as Tables<"orders"> & {
                          order_items?: Tables<"order_items">[];
                        },
                      )
                    }
                    className="ml-auto rounded-full border border-flame bg-flame/10 px-3 py-1 text-xs font-semibold text-flame hover:bg-flame hover:text-white"
                  >
                    🖨 Imprimir Pedido
                  </button>
                  {isMaster && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Excluir o pedido #${String((o as unknown as { order_number?: number }).order_number ?? 0).padStart(2, "0")} de ${o.customer_name}? Esta ação não pode ser desfeita.`)) {
                          deleteOrder.mutate(o.id);
                        }
                      }}
                      className="rounded-full border border-red-500/60 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500 hover:text-white"
                    >
                      🗑 Excluir
                    </button>
                  )}
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
      {printOrder && (
        <OrderPrint order={printOrder} onDone={() => setPrintOrder(null)} />
      )}
    </section>
  );
}

/* =================================================== CLIENTS =================================================== */

function ClientsTab({ isMaster = false }: { isMaster?: boolean }) {
  const qc = useQueryClient();
  const orders = useQuery({ ...ordersQuery, refetchInterval: 15_000 });

  const deleteClient = useMutation({
    mutationFn: async ({ phone, name }: { phone: string; name: string }) => {
      const orderRows = (orders.data ?? []).filter((o) =>
        (o.customer_phone || "").trim()
          ? o.customer_phone === phone
          : o.customer_name === name,
      );
      const ids = orderRows.map((o) => o.id);
      if (ids.length === 0) return;
      await supabase.from("order_items").delete().in("order_id", ids);
      const { error } = await supabase.from("orders").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Cliente e pedidos excluídos");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const clients = (() => {
    const map = new Map<
      string,
      {
        name: string;
        phone: string;
        address: string;
        orderCount: number;
        totalSpent: number;
        lastOrderAt: string;
      }
    >();
    for (const o of orders.data ?? []) {
      const key = (o.customer_phone || "").trim() || o.customer_name;
      const prev = map.get(key);
      if (prev) {
        prev.orderCount += 1;
        prev.totalSpent += Number(o.total);
        if (new Date(o.created_at) > new Date(prev.lastOrderAt)) {
          prev.lastOrderAt = o.created_at;
          prev.address = o.customer_address ?? "";
          prev.name = o.customer_name;
        }
      } else {
        map.set(key, {
          name: o.customer_name,
          phone: o.customer_phone,
          address: o.customer_address ?? "",
          orderCount: 1,
          totalSpent: Number(o.total),
          lastOrderAt: o.created_at,
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime(),
    );
  })();

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-wide sm:text-3xl">Clientes</h2>
          <p className="text-sm text-muted-foreground">
            {clients.length} cliente{clients.length === 1 ? "" : "s"} · agrupado por telefone
          </p>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          Nenhum cliente ainda. Os clientes aparecem aqui assim que fizerem o 1º pedido.
        </div>
      ) : (
        <>
          <ul className="space-y-3 lg:hidden">
            {clients.map((c) => (
              <li key={c.phone + c.name} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.phone}</div>
                  </div>
                  {isMaster && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Excluir ${c.name} e todos os ${c.orderCount} pedido(s)? Esta ação não pode ser desfeita.`)) {
                          deleteClient.mutate({ phone: c.phone, name: c.name });
                        }
                      }}
                      className="shrink-0 rounded-full border border-red-500/60 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500 hover:text-white"
                    >
                      🗑
                    </button>
                  )}
                </div>
                <div className="mt-1 text-xs break-words">{c.address}</div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span>
                    📦 {c.orderCount} pedido{c.orderCount === 1 ? "" : "s"}
                  </span>
                  <span className="font-bold">{BRL(c.totalSpent)}</span>
                  <span className="text-muted-foreground">
                    Último: {new Date(c.lastOrderAt).toLocaleString("pt-BR")}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-2xl border border-border lg:block">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Telefone</th>
                  <th className="p-3">Endereço</th>
                  <th className="p-3 text-right">Pedidos</th>
                  <th className="p-3 text-right">Total gasto</th>
                  <th className="p-3">Último pedido</th>
                  {isMaster && <th className="p-3"></th>}
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.phone + c.name} className="border-t border-border">
                    <td className="p-3 font-semibold">{c.name}</td>
                    <td className="p-3 text-muted-foreground">{c.phone}</td>
                    <td className="p-3 text-muted-foreground">{c.address}</td>
                    <td className="p-3 text-right">{c.orderCount}</td>
                    <td className="p-3 text-right font-bold">{BRL(c.totalSpent)}</td>
                    <td className="p-3 text-muted-foreground">{new Date(c.lastOrderAt).toLocaleString("pt-BR")}</td>
                    {isMaster && (
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Excluir ${c.name} e todos os ${c.orderCount} pedido(s)? Esta ação não pode ser desfeita.`)) {
                              deleteClient.mutate({ phone: c.phone, name: c.name });
                            }
                          }}
                          className="rounded-full border border-red-500/60 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500 hover:text-white"
                        >
                          🗑 Excluir
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

/* =================================================== UI HELPERS =================================================== */

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-flame";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${checked ? "bg-flame" : "bg-secondary"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${checked ? "translate-x-5" : "translate-x-1"}`}
      />
    </button>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-2xl tracking-wide">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProofLink({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const open = async () => {
    setLoading(true);
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 3600);
    setLoading(false);
    if (error || !data) {
      toast.error("Não foi possível abrir o comprovante");
      return;
    }
    setUrl(data.signedUrl);
    window.open(data.signedUrl, "_blank", "noopener");
  };
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={open}
        className="rounded-lg border border-flame px-3 py-1 text-xs font-semibold text-flame hover:bg-flame hover:text-white"
      >
        {loading ? "Abrindo..." : url ? "📎 Reabrir comprovante" : "📎 Ver comprovante Pix"}
      </button>
    </div>
  );
}

function ImageInput({ value, onChange, folder }: { value: string; onChange: (url: string) => void; folder: string }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 10MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data, error: signErr } = await supabase.storage
        .from("media")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr || !data) throw signErr ?? new Error("Falha ao gerar URL");
      onChange(data.signedUrl);
      toast.success("Imagem enviada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {value && (
        <div className="flex items-center gap-3">
          <img src={value} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
          <button type="button" onClick={() => onChange("")} className="text-xs text-destructive hover:underline">
            Remover
          </button>
        </div>
      )}
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
        placeholder="https://..."
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-flame disabled:opacity-50"
        >
          {uploading ? "Enviando..." : "📷 Enviar do dispositivo"}
        </button>
        <span className="text-[11px] text-muted-foreground">ou cole uma URL acima</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
    </div>
  );
}

/* =================================================== ADDONS =================================================== */

type Addon = Tables<"menu_item_addons">;

function AddonsManager({ itemId }: { itemId: string }) {
  const qc = useQueryClient();
  const all = useQuery(addonsQuery);
  const list = (all.data ?? []).filter((a) => a.menu_item_id === itemId);
  const listRef = useRef<HTMLUListElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(list.length);

  useEffect(() => {
    if (list.length > prevLenRef.current && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    prevLenRef.current = list.length;
  }, [list.length]);

  const [draft, setDraft] = useState<{ name: string; price: string }>({ name: "", price: "" });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["menu_item_addons"] });

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.name.trim()) throw new Error("Nome obrigatório");
      const { error } = await supabase.from("menu_item_addons").insert({
        menu_item_id: itemId,
        name: draft.name.trim(),
        price: Number(draft.price || 0),
        position: list.length,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setDraft({ name: "", price: "" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const update = useMutation({
    mutationFn: async (a: Addon) => {
      const { error } = await supabase
        .from("menu_item_addons")
        .update({ name: a.name, price: Number(a.price), active: a.active })
        .eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_item_addons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-bold uppercase text-flame">[anexo]</div>
        <span className="text-[11px] text-muted-foreground">{list.length} item(s)</span>
      </div>

      <ul ref={listRef} className="mb-3 max-h-56 space-y-2 overflow-y-auto pr-1">
        {list.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-2"
          >
            <input
              value={a.name}
              onChange={(e) => update.mutate({ ...a, name: e.target.value })}
              className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm focus:border-flame focus:outline-none"
            />
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">R$</span>
              <input
                type="number"
                step="0.01"
                value={String(a.price)}
                onChange={(e) => update.mutate({ ...a, price: Number(e.target.value) as unknown as Addon["price"] })}
                className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-flame focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-1 text-xs">
              <Switch checked={a.active} onChange={(v) => update.mutate({ ...a, active: v })} />
              Ativo
            </label>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Remover "${a.name}"?`)) del.mutate(a.id);
              }}
              className="ml-auto text-xs font-semibold text-destructive hover:underline"
            >
              Excluir
            </button>
          </li>
        ))}
        {list.length === 0 && (
          <li className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            Nenhum adicional ainda.
          </li>
        )}
      </ul>

      <div ref={formRef} className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <span className="mb-1 block text-[10px] font-semibold uppercase text-muted-foreground">Novo adicional</span>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Ex: Bacon extra"
            className={inputCls}
          />
        </div>
        <div className="w-24">
          <span className="mb-1 block text-[10px] font-semibold uppercase text-muted-foreground">Preço</span>
          <input
            type="number"
            step="0.01"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
            placeholder="0,00"
            className={inputCls}
          />
        </div>
        <button
          type="button"
          onClick={() => add.mutate()}
          disabled={add.isPending}
          className="rounded-lg bg-flame px-3 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50"
        >
          + Adicionar
        </button>
      </div>
    </div>
  );
}
