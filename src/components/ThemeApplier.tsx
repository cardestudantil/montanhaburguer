import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { storeInfoQuery } from "@/lib/queries";

/**
 * Applies the store's custom theme color to CSS variables at runtime.
 * Overrides --primary, --flame and --ring with the color chosen in the admin panel.
 */
export function ThemeApplier() {
  const { data } = useQuery(storeInfoQuery);
  const color = (data as { theme_color?: string | null } | null | undefined)?.theme_color;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) {
      root.style.setProperty("--primary", color);
      root.style.setProperty("--flame", color);
      root.style.setProperty("--ring", color);
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--flame");
      root.style.removeProperty("--ring");
    }
  }, [color]);

  return null;
}
