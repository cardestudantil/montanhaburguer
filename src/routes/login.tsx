import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapHardcodedAdmins } from "@/lib/bootstrap-admins.functions";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({ meta: [{ title: "Login — Painel de Controle" }] }),
  component: LoginPage,
});

const ACCOUNTS = [
  { label: "Master / Admin", email: "admin@app.com", password: "admin123" },
  { label: "Dono da Lanchonete", email: "dono@app.com", password: "loja123" },
];

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel-controle" });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const valid = ACCOUNTS.find(
        (a) => a.email === email.trim().toLowerCase() && a.password === password,
      );
      if (!valid) {
        toast.error("E-mail ou senha incorretos.");
        return;
      }
      // Make sure both hardcoded admin accounts exist in the backend
      await bootstrapHardcodedAdmins();
      const { error } = await supabase.auth.signInWithPassword({
        email: valid.email,
        password: valid.password,
      });
      if (error) throw error;
      navigate({ to: "/painel-controle" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grain">
      <Toaster theme="dark" position="top-center" />
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
        <Link to="/" className="mb-8 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-flame font-display text-2xl text-white shadow-glow">
            M
          </div>
          <span className="font-display text-2xl tracking-wide">Painel de Controle</span>
        </Link>

        <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <h1 className="font-display text-2xl tracking-wide sm:text-3xl">
            Entrar <span className="text-flame">· acesso total</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Por segurança, a senha precisa ser digitada a cada acesso.
          </p>

          <form
            onSubmit={signIn}
            className="mt-6 space-y-3"
            autoComplete="off"
          >
            {/* Honeypots to discourage browser autofill */}
            <input type="text" name="username" autoComplete="username" className="hidden" tabIndex={-1} aria-hidden="true" />
            <input type="password" name="password" autoComplete="new-password" className="hidden" tabIndex={-1} aria-hidden="true" />

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
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-flame"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-flame px-4 py-3 font-display text-lg tracking-wide text-white shadow-glow transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <Link to="/" className="mt-6 text-sm text-muted-foreground hover:text-foreground">
          ← Voltar para a loja
        </Link>
      </div>
    </div>
  );
}
