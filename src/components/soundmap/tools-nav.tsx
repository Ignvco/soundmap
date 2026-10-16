import { NavLink } from "react-router-dom";
import { Calculator, ArrowLeftRight, BookOpen } from "lucide-react";
export function ToolsNav() {
  return (
    <nav className="tools-nav" aria-label="Herramientas de audio">
      <NavLink to="/toolkit">
        <Calculator size={16} />
        Calculadoras
      </NavLink>
      <NavLink to="/compare">
        <ArrowLeftRight size={16} />
        Comparar
      </NavLink>
      <NavLink to="/community">
        <BookOpen size={16} />
        Catálogo local
      </NavLink>
    </nav>
  );
}
