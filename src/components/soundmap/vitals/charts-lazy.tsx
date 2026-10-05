// Envoltorio perezoso de las tarjetas de gráfico.
//
// `charts.tsx` importa recharts (~110 kB gzip). La AI Home es la ruta de
// entrada y sólo dibuja gráficos cuando ya hay un sistema cargado, así que
// importarlo de forma estática obligaba a TODOS los usuarios —incluido el que
// abre la app por primera vez y ve el empty state— a bajar recharts antes del
// primer paint. Acá se difiere hasta que un gráfico se monta de verdad.
import { Suspense, lazy, type ComponentProps } from "react";
import type { ChartCardBar as BarType, ChartCardLine as LineType, DonutCard as DonutType } from "./charts.tsx";

const LazyBar = lazy(() => import("./charts.tsx").then((m) => ({ default: m.ChartCardBar })));
const LazyLine = lazy(() => import("./charts.tsx").then((m) => ({ default: m.ChartCardLine })));
const LazyDonut = lazy(() => import("./charts.tsx").then((m) => ({ default: m.DonutCard })));

/** Placeholder del alto de la tarjeta para que el layout no salte al resolverse. */
function ChartSkeleton({ height = 130 }: { height?: number }) {
  return (
    <div
      aria-hidden="true"
      className="rounded-2xl shimmer"
      style={{ height: height + 96, background: "var(--sm-card)" }}
    />
  );
}

export function ChartCardBar(props: ComponentProps<typeof BarType>) {
  return (
    <Suspense fallback={<ChartSkeleton height={props.height} />}>
      <LazyBar {...props} />
    </Suspense>
  );
}

export function ChartCardLine(props: ComponentProps<typeof LineType>) {
  return (
    <Suspense fallback={<ChartSkeleton height={props.height} />}>
      <LazyLine {...props} />
    </Suspense>
  );
}

export function DonutCard(props: ComponentProps<typeof DonutType>) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyDonut {...props} />
    </Suspense>
  );
}
