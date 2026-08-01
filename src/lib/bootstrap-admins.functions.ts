import { createServerFn } from "@tanstack/react-start";

const ALLOWED = [
  { email: "admin@app.com", password: "admin123" },
  { email: "dono@app.com", password: "loja123" },
];

export const bootstrapHardcodedAdmins = createServerFn({ method: "POST" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    for (const { email, password } of ALLOWED) {
      // Try to find existing user by email (paginate just in case)
      let existing: { id: string; email?: string } | undefined;
      let page = 1;
      while (!existing) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (error) throw error;
        existing = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (existing || data.users.length < 200) break;
        page += 1;
      }

      let userId = existing?.id;
      if (!userId) {
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (createErr) throw createErr;
        userId = created.user!.id;
      } else {
        // Make sure the password matches what we expect (in case it was changed)
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
        });
      }

      // Ensure admin role
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
      if (roleErr) throw roleErr;
    }

    return { ok: true as const };
  },
);
