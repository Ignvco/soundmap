import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "rooms",
      columns: [
        { name: "name", type: "string" },
        { name: "largo", type: "number" },
        { name: "ancho", type: "number" },
        { name: "alto", type: "number" },
        { name: "capacidad", type: "number" },
        { name: "material_paredes", type: "string" },
        { name: "material_piso", type: "string" },
        { name: "material_techo", type: "string" },
        { name: "tiene_ventanales", type: "boolean" },
        { name: "rt60_estimado", type: "number" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "presets",
      columns: [
        { name: "nombre", type: "string" },
        { name: "room_id", type: "string", isIndexed: true },
        { name: "crossover_hz", type: "number" },
        { name: "nivel_tops_db", type: "number" },
        { name: "nivel_subs_db", type: "number" },
        { name: "delay_subs_ms", type: "number" },
        { name: "eq_json", type: "string" },
        { name: "tiene_vidrios", type: "boolean" },
        { name: "es_backup", type: "boolean" },
        { name: "updated_at", type: "number" },
      ],
    }),
    /* ... tableSchema para channels y manuals — misma estructura */
  ],
});
