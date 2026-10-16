import { NavLink } from "react-router-dom";
import { Settings, Users, Sparkles } from "lucide-react";
export function ManagementNav() {
  return (
    <nav className="tools-nav" aria-label="Gestión del proyecto">
      <NavLink to="/settings">
        <Settings size={16} />
        Ajustes
      </NavLink>
      <NavLink to="/collaboration">
        <Users size={16} />
        Colaboración
      </NavLink>
      <NavLink to="/ai-advisor">
        <Sparkles size={16} />
        Asesor
      </NavLink>
    </nav>
  );
}
