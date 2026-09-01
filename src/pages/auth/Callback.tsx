// Auth callback — after Convex kill, Hercules auth is no longer wired up.
// This page just redirects home. Bookmarked callback URLs stay valid.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner.tsx";

export default function AuthCallback() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate("/", { replace: true }), 200);
    return () => clearTimeout(t);
  }, [navigate]);
  return (
    <div className="flex flex-col items-center justify-center h-svh gap-4">
      <Spinner className="size-8" />
      <p className="text-sm text-muted-foreground">Redirigiendo…</p>
    </div>
  );
}
