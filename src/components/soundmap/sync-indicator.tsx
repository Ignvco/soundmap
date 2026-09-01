// Cloud Sync Indicator — compact pill showing sync status.
import { Cloud, CloudOff, CloudCheck, RefreshCw, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import { useSyncContext } from "@/components/providers/sync.tsx";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils.ts";

interface Props {
  className?: string;
  showLabel?: boolean;
}

export function SyncIndicator({ className, showLabel = true }: Props) {
  const { status, lastSyncedAt, isAuthenticated, cloudCount } = useSyncContext();

  const cfg = (() => {
    if (!isAuthenticated) return {
      icon: CloudOff,
      color: "text-muted-foreground",
      bg: "bg-secondary border-border",
      label: "Solo local",
      title: "Iniciá sesión para sincronizar en la nube",
    };
    switch (status) {
      case "syncing":
        return { icon: RefreshCw, color: "text-info", bg: "bg-info/12 border-info/30", label: "Sincronizando…", title: "Sincronizando escenas con la nube", spin: true };
      case "synced":
        return {
          icon: CloudCheck,
          color: "text-accent",
          bg: "bg-accent/12 border-accent/30",
          label: `Sincronizado · ${cloudCount}`,
          title: lastSyncedAt ? `Última sync ${formatDistanceToNow(lastSyncedAt, { addSuffix: true })}` : "Sincronizado",
        };
      case "error":
        return { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/12 border-destructive/30", label: "Error sync", title: "Reintentando automáticamente" };
      default:
        return { icon: Cloud, color: "text-muted-foreground", bg: "bg-secondary border-border", label: "Conectado", title: "En espera" };
    }
  })() as {
    icon: typeof Cloud;
    color: string;
    bg: string;
    label: string;
    title: string;
    spin?: boolean;
  };

  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      title={cfg.title}
      data-testid="sync-indicator"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em]",
        cfg.bg,
        cfg.color,
        className,
      )}
    >
      <Icon size={11} className={cn(cfg.spin && "animate-spin")} strokeWidth={2.5} />
      {showLabel && <span>{cfg.label}</span>}
    </motion.div>
  );
}
