import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { Loader2 } from "lucide-react";

// Componente do Spinner Neutro
function LoadingSpinner() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 z-50">
      <Loader2 className="h-10 w-10 animate-spin text-slate-500" />
      <p className="mt-3 text-sm text-slate-400 font-medium animate-pulse">Carregando bURGUER...</p>
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: LoadingSpinner, // ISTO BLOQUEIA O LAYOUT ANTIGO
  });

  return router;
};
