import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? window.navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Conexão restabelecida!", {
        id: "online-status",
        duration: 3000,
        icon: <Wifi className="h-4 w-4" />,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("Sem conexão com a internet. Suas alterações serão salvas assim que a rede voltar", {
        id: "online-status",
        duration: Infinity,
        icon: <WifiOff className="h-4 w-4" />,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
