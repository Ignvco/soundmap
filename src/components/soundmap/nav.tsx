// Cabecera de página + logotipo.
//
// Este archivo tenía además `BottomNav`, `SidebarNav` y `AppHeader` (~330
// líneas): la navegación v4 que AppShellV5 dejó de renderizar cuando se pasó a
// `bottom-nav.tsx`. Nada las importaba — de hecho App.tsx tenía un
// `void BottomNav; void SidebarNav;` para callar al linter. También había un
// `export const _unused = {}` con el mismo propósito. Todo eso se eliminó.
import { Link } from "react-router-dom";
import { AudioWaveform } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function PageHeader({ title, subtitle, right }: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-6 mb-8 flex-wrap">
      <div className="min-w-0">
        <h1
          className="text-[1.75rem] md:text-[2.4rem] leading-[1.05] tracking-[-0.03em] font-medium text-foreground"
          data-testid="page-header-title"
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-[14px] text-muted-foreground mt-2 max-w-xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}

export function SoundMapLogo({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2 cursor-pointer" aria-label="SoundMap — inicio">
      <span
        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "var(--sm-accent-dim)", color: "var(--sm-accent)" }}
      >
        <AudioWaveform size={15} strokeWidth={1.75} />
      </span>
      {!compact && (
        <span className="text-[15px] font-medium tracking-[-0.02em] text-foreground">
          SoundMap
        </span>
      )}
    </Link>
  );
}
