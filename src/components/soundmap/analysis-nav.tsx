import { NavLink } from "react-router-dom";

export const ANALYSIS_LINKS = [
  { to: "/compare", label: "Compare A/B", short: "Compare" },
  { to: "/spl-analysis", label: "SPL Analysis", short: "SPL" },
  { to: "/acoustic-analysis", label: "Acoustic Analysis", short: "Acústica" },
  { to: "/stage-map", label: "Stage Map · 3D", short: "Stage Map" },
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
