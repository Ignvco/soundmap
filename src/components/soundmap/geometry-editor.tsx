import { calculateAcoustics } from "@/lib/audio/acoustics";
import {
  geometrySchema,
  geometryWithinRoom,
  OCTAVES,
  surfacesSchema,
} from "@/lib/audio/geometry";
import { useAppStore } from "@/store/app";
import { useState } from "react";
import { toast } from "sonner";
export function GeometryEditor() {
  const { room, applyRoomScan } = useAppStore(),
    [geometry, setGeometry] = useState(""),
    [surfaces, setSurfaces] = useState("");
  if (!room) return null;
  const update = (part: Partial<typeof room>) => {
    const next = { ...room, ...part };
    applyRoomScan(next, calculateAcoustics(next));
  };
  return (
    <details className="rounded-xl border border-border p-4 space-y-4">
      <summary className="min-h-11 cursor-pointer">
        Geometría importada y absorción por bandas
      </summary>
      <p className="text-sm">
        Polígono simple en metros, origen en el centro del suelo. Balcones
        visibles y zonas excluidas de la optimización. El campo directo no
        calcula difracción ni sombras de balcones.
      </p>
      <label className="block text-sm">
        Archivo de geometría JSON
        <input
          className="audit-input"
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 65536) {
              toast.error("Máximo 64 KiB");
              return;
            }
            setGeometry(await f.text());
          }}
        />
      </label>
      <textarea
        aria-label="Geometría JSON"
        className="audit-input font-mono text-xs"
        rows={5}
        value={geometry}
        onChange={(e) => setGeometry(e.target.value)}
        maxLength={65536}
        placeholder={
          '{"outline":[{"x":-5,"z":-5},{"x":5,"z":-5},{"x":5,"z":5},{"x":-5,"z":5}],"balconies":[],"exclusions":[],"source":"Plano del técnico"}'
        }
      />
      <div className="flex gap-2">
        <button
          className="audit-button"
          onClick={() => {
            try {
              const g = geometrySchema.parse(JSON.parse(geometry));
              if (!geometryWithinRoom(g, room.width, room.length, room.height))
                throw new Error(
                  "La geometría excede el recinto o el balcón queda fuera del polígono",
                );
              update({ geometry: g });
              toast.success("Geometría incorporada");
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          Aplicar geometría
        </button>
        <button
          className="audit-button"
          onClick={() => update({ geometry: undefined })}
        >
          Usar recinto rectangular
        </button>
      </div>
      <p className="text-sm">
        Absorción: registra superficies, áreas y seis coeficientes α (
        {OCTAVES.join(" / ")} Hz) con su fuente documental. El público usa una
        aproximación de 0,4 m² por persona en cada banda; revísala para el
        recinto.
      </p>
      <textarea
        aria-label="Superficies acústicas JSON"
        className="audit-input font-mono text-xs"
        rows={4}
        value={surfaces}
        onChange={(e) => setSurfaces(e.target.value)}
        maxLength={65536}
        placeholder={
          '[{"id":"wall","label":"Muros","areaM2":100,"alpha":[0.1,0.1,0.1,0.1,0.1,0.1],"source":"Ficha del material"}]'
        }
      />
      <button
        className="audit-button"
        onClick={() => {
          try {
            update({
              acousticSurfaces: surfacesSchema.parse(JSON.parse(surfaces)),
            });
            toast.success("Superficies actualizadas");
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      >
        Aplicar superficies
      </button>
      <label className="block">
        Modelo de absorción
        <select
          className="audit-input"
          value={room.rtMethod ?? "sabine"}
          onChange={(e) =>
            update({ rtMethod: e.target.value as "sabine" | "eyring" })
          }
        >
          <option value="sabine">Sabine</option>
          <option value="eyring">Eyring (campo difuso)</option>
        </select>
      </label>
      {room.geometry && (
        <p className="text-xs">
          Plano: {room.geometry.outline.length} vértices ·{" "}
          {room.geometry.balconies.length} balcones · {room.geometry.source}
        </p>
      )}
    </details>
  );
}
