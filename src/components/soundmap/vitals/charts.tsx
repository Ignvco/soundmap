// Vitals chart card — bar / line / donut inside a StatCard.
// Uses recharts under the hood but hides the ceremony. Highlight day/point
// gets the lime accent, rest is muted. No axes labels overload — clean.
import { type ReactNode } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { StatCard, V, DeltaChip } from "./index.tsx";

interface BarPoint { label: string; value: number; highlight?: boolean }
interface LinePoint { label: string; value: number }
interface DonutSlice { name: string; value: number; color?: string }

// ── ChartCardBar — Kalo bar chart ─────────────────────────────────────────
export function ChartCardBar({
  title, value, unit, extra, data, delta, height = 130, yTicks, testId,
}: {
  title: string;
  value: string | number;
  unit?: string;
  extra?: ReactNode;
  data: BarPoint[];
  delta?: { value: number; unit?: string; label?: string; tone?: "auto" | "good" | "bad" };
  height?: number;
  /** Optional y-axis ticks to display on the right side. */
  yTicks?: number[];
  testId?: string;
}) {
  return (
    <StatCard label={title} value={value} unit={unit} delta={delta} extra={extra} testId={testId}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 24, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="2 4" stroke={V.hairline} />
          <XAxis
            dataKey="label"
            tick={{ fill: V.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            orientation="right"
            tick={{ fill: V.muted, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={36}
            ticks={yTicks}
            interval={0}
            domain={yTicks ? [Math.min(...yTicks), Math.max(...yTicks)] : undefined}
          />
          <Tooltip
            cursor={{ fill: "rgba(201,240,62,0.06)" }}
            contentStyle={{ background: V.cardAlt, border: `1px solid ${V.hairline}`, borderRadius: 10, fontSize: 11 }}
            labelStyle={{ color: V.muted, fontSize: 10 }}
            itemStyle={{ color: "#F4F4F5" }}
          />
          <Bar dataKey="value" radius={[6, 6, 6, 6]} maxBarSize={22}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.highlight ? V.accent : "rgba(201,240,62,0.35)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </StatCard>
  );
}

// ── ChartCardLine — Kalo weight-trend line chart ──────────────────────────
export function ChartCardLine({
  title, value, unit, extra, data, delta, height = 140, yTicks, testId,
}: {
  title: string;
  value: string | number;
  unit?: string;
  extra?: ReactNode;
  data: LinePoint[];
  delta?: { value: number; unit?: string; label?: string; tone?: "auto" | "good" | "bad" };
  height?: number;
  yTicks?: number[];
  testId?: string;
}) {
  return (
    <StatCard label={title} value={value} unit={unit} delta={delta} extra={extra} testId={testId}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 12, right: 28, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="2 4" stroke={V.hairline} />
          <XAxis
            dataKey="label"
            tick={{ fill: V.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            orientation="right"
            tick={{ fill: V.muted, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={36}
            ticks={yTicks}
            interval={0}
            domain={yTicks ? [Math.min(...yTicks), Math.max(...yTicks)] : ["dataMin - 1", "dataMax + 1"]}
          />
          <Tooltip
            cursor={{ stroke: V.accent, strokeWidth: 1 }}
            contentStyle={{ background: V.cardAlt, border: `1px solid ${V.hairline}`, borderRadius: 10, fontSize: 11 }}
            labelStyle={{ color: V.muted, fontSize: 10 }}
            itemStyle={{ color: "#F4F4F5" }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={V.accent}
            strokeWidth={2}
            dot={{ fill: V.accent, r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: V.accent, stroke: "#131316", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </StatCard>
  );
}

// ── DonutCard — macro balance style ────────────────────────────────────────
export function DonutCard({
  title, data, testId,
}: {
  title: string;
  data: DonutSlice[];
  testId?: string;
}) {
  const palette = [V.accent, V.amber, V.warm, V.blue, V.muted];
  return (
    <div
      data-testid={testId}
      className="rounded-2xl p-5"
      style={{ background: V.card, boxShadow: `0 0 0 1px ${V.hairline}` }}
    >
      <p className="text-[13px] text-muted-foreground font-medium mb-3">{title}</p>
      <div className="flex items-center gap-4">
        <div style={{ width: 76, height: 76 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data} dataKey="value" nameKey="name"
                innerRadius={22} outerRadius={36}
                paddingAngle={2} stroke="none"
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color ?? palette[i % palette.length]} />
                ))}
              </Pie>
              <Legend content={() => null} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: d.color ?? palette[i % palette.length] }}
              />
              <span className="text-muted-foreground flex-1 min-w-0 truncate">{d.name}</span>
              <span className="font-mono tabular-nums text-foreground">{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Re-export deltaChip for convenience
export { DeltaChip };
