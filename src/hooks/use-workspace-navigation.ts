import { useAppStore } from "@/store/app";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
const shortcuts: Record<string, string> = {
  a: "/audit",
  d: "/design",
  m: "/perform",
  s: "/stage-map",
  e: "/export",
};
export function useWorkspaceNavigation() {
  const navigate = useNavigate(),
    location = useLocation();
  useEffect(() => {
    if (
      !location.pathname.startsWith("/auth") &&
      !location.pathname.startsWith("/shared")
    ) {
      try {
        sessionStorage.setItem(
          "soundmap-last-route",
          location.pathname + location.search,
        );
      } catch {
        /* Session history is optional. */
      }
    }
  }, [location.pathname, location.search]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat) return;
      if (e.altKey && e.shiftKey && shortcuts[e.key.toLowerCase()]) {
        e.preventDefault();
        navigate(shortcuts[e.key.toLowerCase()]);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        const s = useAppStore.getState();
        if (!s.room) return;
        e.preventDefault();
        s.saveScene(s.room.name);
        toast.success("Revisión local guardada");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);
}
export function lastWorkspaceRoute() {
  try {
    const route = sessionStorage.getItem("soundmap-last-route");
    return route?.startsWith("/") && !route.startsWith("//") ? route : "/audit";
  } catch {
    return "/audit";
  }
}
