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

    let userId: string | null = null;
    let updated = false;

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (createErr) {
      const msg = createErr.message ?? "";
      const alreadyExists =
        /already been registered|already registered|already exists|duplicate/i.test(msg);
      if (!alreadyExists) throw new Error(msg);

      // Conta já existe: atualiza a senha e garante o perfil escolhido.
      let page = 1;
      while (page <= 10 && !userId) {
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (listErr) throw new Error(listErr.message);
        const found = list.users.find((u) => (u.email ?? "").toLowerCase() === data.email);
        if (found) userId = found.id;
        if (list.users.length < 200) break;
        page += 1;
      }
      if (!userId) throw new Error("Não foi possível localizar a conta existente");

      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: data.password,
        email_confirm: true,
      });
      if (updErr) throw new Error(updErr.message);
      updated = true;
    } else {
      userId = created.user!.id;
    }

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: data.role }, { onConflict: "user_id,role" });
    if (roleErr) throw roleErr;

    return { ok: true as const, email: data.email, role: data.role, updated };

  });

export type StaffAccount = {
  id: string;
  email: string;
  roles: string[];
  createdAt: string;
  lastSignInAt: string | null;
};

export const listStaffAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffAccount[]> => {
    const { data: isAdmin, error: roleCheckErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleCheckErr) throw roleCheckErr;
    if (!isAdmin) throw new Error("Apenas administradores podem ver as contas");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const users: { id: string; email: string; created_at: string; last_sign_in_at: string | null }[] = [];
    let page = 1;
    while (page <= 10) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      for (const u of list.users) {
        users.push({
          id: u.id,
          email: u.email ?? "",
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
        });
      }
      if (list.users.length < 200) break;
      page += 1;
    }

    const { data: roles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (rolesErr) throw rolesErr;

    const byUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role);
      byUser.set(r.user_id, arr);
    }

    return users
      .map((u) => ({
        id: u.id,
        email: u.email,
        roles: byUser.get(u.id) ?? [],
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
      }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  });
