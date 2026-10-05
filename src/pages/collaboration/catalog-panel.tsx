import { Field } from "@/components/soundmap/audit-fields";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { GearItem } from "@/lib/audio/pa-engine";
import { gearSchema } from "@/lib/audit/validation";
import { useAppStore } from "@/store/app";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
export function CatalogPanel() {
  const approved = useQuery(api.catalog.list),
    permissions = useQuery(api.catalog.permissions);
  const pending = useQuery(
    api.catalog.pending,
    permissions?.canModerate ? {} : "skip",
  );
  const submit = useMutation(api.catalog.submit),
    review = useMutation(api.catalog.review);
  const [data, setData] = useState(""),
    [source, setSource] = useState(""),
    [busy, setBusy] = useState(false);
  const apply = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      toast.success("Operación completada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const decide = (
    id: Id<"catalogSubmissions">,
    status: "approved" | "rejected",
  ) => {
    const note = window.prompt(
      "Documenta campos contrastados, condiciones y fuentes (mínimo 10 caracteres):",
    );
    if (note) void apply(() => review({ id, status, note }));
  };
  return (
    <section className="space-y-4 border-t border-border pt-6">
      <h2 className="text-xl font-semibold">
        Catálogo compartido con revisión documental
      </h2>
      <p className="text-sm text-muted-foreground">
        La revisión conserva autoría, fuente y nota del moderador. No certifica
        una prueba física. Cada incorporación al inventario es explícita.
      </p>
      <details>
        <summary className="audit-button">Proponer ficha</summary>
        <div className="space-y-3 mt-3">
          <Field label="Ficha JSON (esquema GearItem)">
            <textarea
              className="audit-input min-h-40 font-mono"
              maxLength={20000}
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder={
                '{"id":"marca-modelo","brand":"Marca","model":"Modelo","category":"tops","active":true,"splMax":120}'
              }
            />
          </Field>
          <Field label="Fuente HTTPS del fabricante">
            <input
              className="audit-input"
              type="url"
              value={source}
              maxLength={2000}
              onChange={(e) => setSource(e.target.value)}
            />
          </Field>
          <button
            className="audit-button"
            disabled={busy || !data || !source}
            onClick={() =>
              apply(async () => {
                const gear = gearSchema.parse(JSON.parse(data));
                await submit({ data: JSON.stringify(gear), source });
                setData("");
                setSource("");
              })
            }
          >
            Enviar a revisión
          </button>
        </div>
      </details>
      {approved?.length === 0 && (
        <p>No hay fichas aprobadas en este servicio.</p>
      )}
      {approved?.map((row) => {
        const gear = gearSchema.parse(JSON.parse(row.data));
        return (
          <article key={row._id} className="v6-panel p-4 space-y-2 break-words">
            <h3>
              {gear.brand} {gear.model}
            </h3>
            <p className="text-xs">
              Propuesta: {row.author} · Revisión:{" "}
              {row.reviewer || "Sin atribución histórica"}
            </p>
            <a
              href={row.source}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Fuente documental
            </a>
            <p className="text-sm">{row.reviewNote}</p>
            <button
              className="audit-button"
              onClick={() => {
                const state = useAppStore.getState();
                const groups = {
                  tops: state.tops,
                  subs: state.subs,
                  monitors: state.monitors,
                  dsp: state.dspUnits,
                  amp: state.amps,
                  mixer: state.mixers,
                  mic: state.mics,
                };
                state.setGear(gear.category, [
                  ...groups[gear.category].filter((g) => g.id !== gear.id),
                  gear as GearItem,
                ]);
                toast.success("Ficha incorporada al inventario local");
              }}
            >
              Incorporar al inventario
            </button>
          </article>
        );
      })}
      {permissions?.canModerate && (
        <div className="space-y-3">
          <h3>Pendientes de moderación</h3>
          {pending?.map((row) => (
            <article key={row._id} className="v6-panel p-4 space-y-3">
              <p className="text-xs break-all">Autor: {row.author}</p>
              <a
                href={row.source}
                rel="noreferrer"
                target="_blank"
                className="underline"
              >
                Abrir fuente
              </a>
              <pre className="text-xs whitespace-pre-wrap break-all">
                {row.data}
              </pre>
              <div className="flex gap-2">
                <button
                  className="audit-button"
                  disabled={busy}
                  onClick={() => decide(row._id, "approved")}
                >
                  Aprobar con nota
                </button>
                <button
                  className="audit-button"
                  disabled={busy}
                  onClick={() => decide(row._id, "rejected")}
                >
                  Rechazar con motivo
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
