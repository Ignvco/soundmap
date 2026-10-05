import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
export default function AuthCallback() {
  const auth = useAuth(),
    navigate = useNavigate();
  useEffect(() => {
    if (!auth.isLoading && !auth.error)
      navigate("/collaboration", { replace: true });
  }, [auth.isLoading, auth.error, navigate]);
  return (
    <main className="audit-page">
      <p role="status">{auth.error?.message ?? "Validando sesión…"}</p>
    </main>
  );
}
