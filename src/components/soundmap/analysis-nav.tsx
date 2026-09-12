import { NavLink } from "react-router-dom";

export const ANALYSIS_LINKS = [
  { to: "/compare", label: "Compare A/B" },
  { to: "/spl-analysis", label: "SPL Analysis" },
  { to: "/acoustic-analysis", label: "Acoustic Analysis" },
  { to: "/stage-map", label: "Stage Map · 3D" },
] as const;

export function AnalysisNav() {
  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border mb-6 pb-2"
      aria-label="Análisis"
    >
      {ANALYSIS_LINKS.map((x) => (
        <NavLink
          key={x.to}
          to={x.to}
          className={({ isActive }) =>
            `v6-button shrink-0 ${isActive ? "text-accent bg-accent/5" : ""}`
          }
        >
          {x.label}
        </NavLink>
      ))}
    </nav>
  );
}
