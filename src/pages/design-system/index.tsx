// SoundMap Design System — showcase.
//
// La fuente visual de verdad. Si mañana agregás una pantalla nueva, mirás acá
// y usás lo que ya existe en vez de inventar un botón más.
//
// También sirve de test visual: cuando cambiás un token, esta página muestra
// TODO lo afectado de una sola vez, sin recorrer quince pantallas.
import { useState } from "react";
import {
  Radio, Layers, Compass, Trash2, Plus, Search, Settings as SettingsIcon,
} from "lucide-react";
import {
  Card, Hairline, ScreenShell, SectionHeader,
  StatusPill, WarningBanner, EmptyState, Skeleton,
} from "@/components/soundmap/vitals/primitives.tsx";
import {
  Button, IconBtn, StatusDot, List, ListRow, ListIcon, Recommendation,
  type ButtonVariant, type SystemStatus,
} from "@/components/soundmap/vitals/controls.tsx";
import { Metric, MetricRow, Divider } from "@/components/soundmap/vitals/metric.tsx";

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="py-10">
      <SectionHeader title={title} subtitle={hint} />
      {children}
      <div className="mt-10"><Divider /></div>
    </section>
  );
}

const SWATCHES: { name: string; token: string }[] = [
  { name: "background", token: "var(--background)" },
  { name: "surface-1", token: "var(--surface-1)" },
  { name: "surface-2", token: "var(--surface-2)" },
  { name: "surface-3", token: "var(--surface-3)" },
  { name: "accent", token: "var(--accent)" },
  { name: "warning", token: "var(--warning)" },
  { name: "destructive", token: "var(--destructive)" },
  { name: "info", token: "var(--info)" },
];

const STATUSES: SystemStatus[] = [
  "live", "optimized", "healthy", "warning", "offline", "processing", "analyzing",
];

export default function DesignSystem() {
  const [seg, setSeg] = useState("metric");

  return (
    <ScreenShell width="wide" className="pt-10 pb-24">
      <p className="t-label" style={{ color: "var(--muted-foreground)" }}>
        SoundMap
      </p>
      <h1 className="t-display text-foreground mt-2">Design System</h1>
      <p className="t-body mt-3 max-w-xl" style={{ color: "var(--muted-foreground)" }}>
        Fuente visual de verdad. Todo lo que aparece acá está construido sobre
        tokens: cambiar uno se refleja en toda la app.
      </p>

      <div className="mt-10"><Divider /></div>

      {/* ── Color ───────────────────────────────────────────────────────── */}
      <Block title="Color" hint="Un acento, tres semánticos. El lime se reserva para activo, correcto y acción primaria.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SWATCHES.map((s) => (
            <div key={s.name}>
              <div
                className="h-16 w-full"
                style={{ background: s.token, borderRadius: "var(--radius-control)", boxShadow: "var(--elev-1)" }}
              />
              <p className="t-caption mt-2 font-mono" style={{ color: "var(--muted-foreground)" }}>
                {s.name}
              </p>
            </div>
          ))}
        </div>
      </Block>

      {/* ── Tipografía ──────────────────────────────────────────────────── */}
      <Block title="Tipografía" hint="Geist para texto, Geist Mono con tabular-nums para valores técnicos.">
        <div className="space-y-4">
          <p className="t-display text-foreground">Display · 42px</p>
          <p className="t-heading text-foreground">Heading · 30px</p>
          <p className="t-title text-foreground">Title · 20px</p>
          <p className="t-body text-foreground">Body · 14px — el cuerpo de texto de la app.</p>
          <p className="t-small" style={{ color: "var(--muted-foreground)" }}>Small · 13px — texto secundario.</p>
          <p className="t-label" style={{ color: "var(--muted-foreground)" }}>Label · 11px mayúsculas</p>
          <p className="t-caption" style={{ color: "var(--muted-foreground)" }}>Caption · 10px</p>
          <p className="t-mono text-foreground" style={{ fontSize: "var(--text-metric-md)" }}>
            102.3 dB · 1.42 s · 125 Hz · −3.5 dB · LR24
          </p>
        </div>
      </Block>

      {/* ── Métricas ────────────────────────────────────────────────────── */}
      <Block title="Métricas" hint="Lectura de instrumento, no tarjeta. Sin caja: el número es el elemento.">
        <MetricRow>
          <Metric value="102" unit="dB" label="Max SPL" />
          <Metric value="87" unit="%" label="Cobertura" />
          <Metric value="1.42" unit="s" label="RT60 mid" />
          <Metric value="+7.4" unit="dB" label="Headroom" tone="accent" />
        </MetricRow>
      </Block>

      {/* ── Botones ─────────────────────────────────────────────────────── */}
      <Block title="Botones" hint="El pill se reserva para la acción primaria de cada pantalla. Todo lo demás usa radius-control.">
        <div className="flex flex-wrap items-center gap-3">
          {(["primary", "secondary", "ghost", "destructive"] as ButtonVariant[]).map((v) => (
            <Button key={v} variant={v}>{v}</Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Button size="compact">compact</Button>
          <Button size="default">default</Button>
          <Button size="large">large</Button>
          <Button variant="primary" pill>primary · pill</Button>
          <Button disabled>disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <IconBtn label="Buscar"><Search size={15} strokeWidth={1.75} /></IconBtn>
          <IconBtn label="Ajustes"><SettingsIcon size={15} strokeWidth={1.75} /></IconBtn>
          <IconBtn label="Eliminar" variant="destructive"><Trash2 size={15} strokeWidth={1.75} /></IconBtn>
        </div>
      </Block>

      {/* ── Estado ──────────────────────────────────────────────────────── */}
      <Block title="Estado" hint="Indicadores chicos, no badges grandes. El punto ya comunica; un chip relleno lo diría dos veces.">
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          {STATUSES.map((s) => <StatusDot key={s} status={s} />)}
        </div>
        <div className="flex flex-wrap gap-2 mt-6">
          <StatusPill tone="ok">Sincronizado</StatusPill>
          <StatusPill tone="warn">Revisar</StatusPill>
          <StatusPill tone="danger">Crítico</StatusPill>
          <StatusPill tone="info">Medición</StatusPill>
          <StatusPill tone="neutral">Local</StatusPill>
        </div>
      </Block>

      {/* ── Superficies ─────────────────────────────────────────────────── */}
      <Block title="Superficies" hint="Se diferencian por tonalidad y hairline, no por sombras pesadas.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card tone="default"><p className="t-small text-foreground">default</p></Card>
          <Card tone="raised"><p className="t-small text-foreground">raised</p></Card>
          <Card tone="accent"><p className="t-small" style={{ color: "var(--accent)" }}>accent</p></Card>
        </div>
      </Block>

      {/* ── Listas ──────────────────────────────────────────────────────── */}
      <Block title="Listas" hint="Para información estructurada, la lista manda sobre la card.">
        <List>
          <ListRow
            leading={<ListIcon tone="accent"><Layers size={15} strokeWidth={1.75} /></ListIcon>}
            title="Teatro Gran Rex — Main PA"
            subtitle="2.186 pax · RT60 1.42 s"
            trailing={<span className="t-mono t-small text-foreground">102 dB</span>}
            onClick={() => {}}
          />
          <ListRow
            leading={<ListIcon><Compass size={15} strokeWidth={1.75} /></ListIcon>}
            title="Concierto Exterior — Festival"
            subtitle="Aire libre · 35 °C"
            trailing={<span className="t-mono t-small text-foreground">98 dB</span>}
            onClick={() => {}}
          />
          <ListRow
            leading={<ListIcon><Radio size={15} strokeWidth={1.75} /></ListIcon>}
            title="Iglesia Canaán — Domingo"
            subtitle="15 × 10 m"
            trailing={<span className="t-mono t-small text-foreground">92 dB</span>}
            divider={false}
            onClick={() => {}}
          />
        </List>
      </Block>

      {/* ── Controles segmentados ───────────────────────────────────────── */}
      <Block title="Controles" hint="Todos comparten altura, radio y tipografía.">
        <div
          className="inline-flex p-1 gap-1"
          style={{ borderRadius: "var(--radius-control)", background: "var(--surface-1)" }}
          role="tablist"
        >
          {["metric", "imperial"].map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={seg === v}
              onClick={() => setSeg(v)}
              className="px-4 t-small font-medium cursor-pointer"
              style={{
                height: "var(--control-h-sm)",
                borderRadius: "var(--radius-chip)",
                background: seg === v ? "var(--surface-3)" : "transparent",
                color: seg === v ? "var(--foreground)" : "var(--muted-foreground)",
                transition: "background var(--dur-fast) var(--ease)",
              }}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="mt-4 max-w-sm">
          <input
            placeholder="Buscar equipo…"
            className="w-full px-3.5 t-small text-foreground bg-transparent focus:outline-none"
            style={{
              height: "var(--control-h)",
              borderRadius: "var(--radius-control)",
              background: "var(--surface-1)",
              boxShadow: "0 0 0 1px var(--border)",
            }}
          />
        </div>
      </Block>

      {/* ── SoundMap Intelligence ───────────────────────────────────────── */}
      <Block title="SoundMap Intelligence" hint="Separa el hallazgo de la acción: si no hay acción concreta, es un comentario, no una recomendación.">
        <div className="max-w-xl">
          <Recommendation
            finding="El cruce sub/top está generando una interacción alrededor de 100 Hz."
            action="Recomendado: mover el cruce a 110 Hz."
            impact="high"
            onApply={() => {}}
            onAnalyze={() => {}}
          />
        </div>
      </Block>

      {/* ── Feedback ────────────────────────────────────────────────────── */}
      <Block title="Feedback" hint="Vacío, carga, advertencia.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <WarningBanner title="Rig mixto">
              El cruce lo dicta el top más restrictivo (90 Hz).
            </WarningBanner>
            <div className="mt-4 space-y-2">
              <Skeleton height={56} />
              <Skeleton height={56} />
            </div>
          </div>
          <Card padded={false}>
            <EmptyState
              icon={<Plus size={18} strokeWidth={1.75} />}
              title="Sin escenas guardadas"
              description="Cuando guardes un sistema, aparece acá."
              action={<Button variant="primary" pill>Crear escena</Button>}
            />
          </Card>
        </div>
      </Block>

      <Hairline />
      <p className="t-caption mt-6" style={{ color: "var(--muted-foreground)" }}>
        Todos los valores provienen de tokens en <span className="t-mono">src/index.css</span>.
        No agregar colores, radios ni espaciados fuera de esa escala.
      </p>
    </ScreenShell>
  );
}
