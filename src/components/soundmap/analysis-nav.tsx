import { NavLink } from "react-router-dom";

export const ANALYSIS_LINKS = [
  { to: "/compare", label: "Comparar A/B", short: "Comparar" },
  { to: "/spl-analysis", label: "Cobertura SPL", short: "SPL" },
  { to: "/acoustic-analysis", label: "Acústica", short: "Acústica" },
  { to: "/stage-map", label: "Plano 2D / 3D", short: "Plano" },
] as const;

export function AnalysisNav() {
  return (
    <nav className="analysis-tabs" aria-label="Análisis">
      {ANALYSIS_LINKS.map((x) => (
        <NavLink
          key={x.to}
          to={x.to}
          aria-label={x.label}
          className={({ isActive }) =>
            `analysis-tab ${isActive ? "is-active" : ""}`
          }
        >
          <span className="sm:hidden">{x.short}</span>
          <span className="hidden sm:inline">{x.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
