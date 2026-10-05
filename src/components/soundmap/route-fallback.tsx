// Fallback mientras baja el chunk de una ruta lazy.
// Deliberadamente sobrio: un spinner que aparece de golpe en una transición de
// 80 ms se lee como un glitch. Se difiere 180 ms, así las navegaciones rápidas
// (chunk cacheado) no muestran nada.
import { useEffect, useState } from "react";

export function RouteFallback() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 180);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="min-h-[60dvh] flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Cargando…</span>
      <div
        aria-hidden="true"
        className="h-6 w-6 rounded-full border-2 animate-spin"
        style={{
          borderColor: "rgba(255,255,255,0.10)",
          borderTopColor: "var(--sm-accent)",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
      />
    </div>
  );
}
