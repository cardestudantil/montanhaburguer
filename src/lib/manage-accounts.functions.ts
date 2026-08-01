import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type NewAccount = { email: string; password: string; role: "admin" | "lanchonete" };

export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: NewAccount) => {
    const email = String(input?.email ?? "").trim().toLowerCase();
    const password = String(input?.password ?? "");
    const role = input?.role === "lanchonete" ? "lanchonete" : "admin";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("E-mail inválido");
    if (password.length < 6) throw new Error("A senha precisa ter ao menos 6 caracteres");
    return { email, password, role } as NewAccount;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleCheckErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleCheckErr) throw roleCheckErr;
    if (!isAdmin) throw new Error("Apenas administradores podem criar contas");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (createErr) throw new Error(createErr.message);

    const userId = created.user!.id;
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: data.role }, { onConflict: "user_id,role" });
    if (roleErr) throw roleErr;

    return { ok: true as const, email: data.email, role: data.role };
  });
