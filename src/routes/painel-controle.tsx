import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "./_authenticated/admin";

export const Route = createFileRoute("/painel-controle")({
  ssr: false,
  head: () => ({ meta: [{ title: "Painel de Controle — Marcão Lanches" }] }),
  component: AdminPage,
});
