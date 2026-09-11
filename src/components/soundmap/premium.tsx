// Premium primitives — shared Apple/Linear/Arc surface for all subpages.
// Replaces the legacy ScreenShell + PageHeader + GlassCard combo. Keeps
// functionality identical, only the visual layer changes.
import { motion } from "motion/react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils.ts";

interface PremiumShellProps {
  /** Small uppercase label above the title (e.g. "COMUNIDAD"). */
  eyebrow?: string;
  /** Big page title. */
  title: string;
  /** Optional muted body under the title. */
  subtitle?: string;
  /** Optional right-aligned CTA or control rendered next to the title. */
  right?: ReactNode;
  /** Page body. */
  children: ReactNode;
  /** Tailwind class for the max-width wrapper (default max-w-[1400px]). */
  wrapperClassName?: string;
  "data-testid"?: string;
}

export function PremiumShell({
  eyebrow, title, subtitle, right, children, wrapperClassName, ...rest
}: PremiumShellProps) {
  return (
    <div
      className="v6-workspace"
      data-testid={rest["data-testid"]}
    >
      <div className={cn("mx-auto", wrapperClassName ?? "max-w-[1400px]")}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {eyebrow && (
            <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-4">
              {eyebrow}
            </p>
          )}
          <div className="flex items-end justify-between gap-6 mb-3 flex-wrap">
            <h1
              className="v6-heading"
              data-testid="premium-title"
            >
              {title}
            </h1>
            {right && <div className="shrink-0">{right}</div>}
          </div>
          {subtitle && (
            <p className="text-[15px] text-muted-foreground max-w-xl leading-relaxed mb-6">
              {subtitle}
            </p>
          )}
          {!subtitle && <div className="mb-6" />}
        </motion.div>
        {children}
      </div>
    </div>
  );
}

// ── Quiet card container — replaces GlassCard ───────────────────────────────
interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
  "data-testid"?: string;
}
export function PremiumCard({ children, className, interactive, onClick, ...rest }: PremiumCardProps) {
  return (
    <div
      onClick={onClick}
      data-testid={rest["data-testid"]}
      className={cn(
        "rounded-2xl",
        interactive && "cursor-pointer",
        className,
      )}
      style={{
        background: "rgba(255,255,255,0.02)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.05)",
        transition: interactive ? "background-color 0.3s ease, box-shadow 0.3s ease" : undefined,
      }}
    >
      {children}
    </div>
  );
}

// ── Whisper section header — replaces uppercase font-black labels ──────────
export function SectionEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground", className)}>
      {children}
    </p>
  );
}

// ── Quiet ghost button (secondary CTA) ─────────────────────────────────────
interface QuietButtonProps {
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  variant?: "ghost" | "solid" | "danger";
  size?: "sm" | "md";
  hue?: string;
  "data-testid"?: string;
}
export function QuietButton({
  onClick, children, className, disabled, variant = "ghost", size = "md", hue, ...rest
}: QuietButtonProps) {
  const pad = size === "sm" ? "px-3 py-1.5 text-[12px]" : "px-4 py-2.5 text-[13px]";
  const solidBg = hue ?? "var(--foreground)";
  const solidColor = "var(--background)";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={rest["data-testid"]}
      className={cn(
        "inline-flex items-center gap-2 rounded-md font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
        pad,
        className,
      )}
      style={{
        background:
          variant === "solid" ? solidBg
          : variant === "danger" ? "#FF6B4A12"
          : "rgba(255,255,255,0.03)",
        boxShadow:
          variant === "solid" ? "none"
          : variant === "danger" ? "0 0 0 1px #FF6B4A55"
          : "0 0 0 1px rgba(255,255,255,0.06)",
        color:
          variant === "solid" ? solidColor
          : variant === "danger" ? "var(--sm-warm)"
          : "var(--foreground)",
        transition: "background-color 0.3s ease, box-shadow 0.3s ease, color 0.3s ease",
      }}
    >
      {children}
    </button>
  );
}

// ── Divider ─────────────────────────────────────────────────────────────────
export function PremiumDivider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full", className)} style={{ background: "rgba(255,255,255,0.05)" }} />;
}
