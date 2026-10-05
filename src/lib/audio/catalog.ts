import type { GearItem } from "./pa-engine";

export const CATALOG_REVISION = "2026-10-02";
const jbl = "https://www.jbl.com/on/demandware.static/-/Sites-masterCatalog_Harman/default/dwac36f4c8/pdfs/SRX906LA_Spec_Sheet-1000365006A-EN_Final.pdf";
const qsc = "https://www.qscaudio.com/resource-files/productresources/spk/kla/q_spk_kla_specs.pdf";
const k2 = "https://www.l-acoustics.com/products/k2/";
const crown = "https://www.crownaudio.com/en-US/products/xls-2502";

/** Only reviewed fields are asserted. Other legacy entries remain visibly unverified. */
const corrections: Record<string, { values: Partial<GearItem>; source: string; conditions: string }> = {
  "jbl-srx906": { source: jbl, conditions: "SPL pico a 1 m, campo libre; ruido rosa, crest 12 dB. Banda -10 dB con preset array. Directividad vertical depende del array.",
    values: { active: true, rmsWatts: 600, peakWatts: 880, splMax: 134, coverageH: 120, coverageV: undefined, freqLow: 63, freqHigh: 17000, weight: 16.8,
      cabinetType: "line-array", dimensionsM: { width: 0.507, height: 0.243, depth: 0.420 }, powerKind: "amplifier-module" } },
  "la-k2": { source: k2, conditions: "Preset K2_70; SPL pico a 1 m. PANFLEX seleccionable; vertical depende del array. Cuatro vías de amplificación externa dedicada; no usar un amp genérico.",
    values: { active: false, rmsWatts: undefined, peakWatts: undefined, splMax: 147, freqLow: 35, freqHigh: 20000, coverageH: 70, coverageV: undefined,
      dspIntegrated: false, requiredAmp: "LA4X / LA8 / LA12X con preset K2", cabinetType: "line-array", dimensionsM: { width: 1.338, height: 0.354, depth: 0.4 }, weight: 56 } },
  "qsc-kla181": { source: qsc, conditions: "SPL máximo a 1 m. Extensión -10 dB 33 Hz; límite superior de simulación pendiente de comprobar contra el preset usado.",
    values: { splMax: 135, rmsWatts: 1000, peakWatts: undefined, freqLow: 33, weight: 47.2, dimensionsM: { width: 0.594, height: 0.547, depth: 0.653 }, powerKind: "amplifier-module" } },
  "qsc-kla12": { source: qsc, conditions: "Banda -10 dB; cobertura nominal por caja 90 x 18 grados; potencia del módulo 500 + 500 W.",
    values: { splMax: 131, rmsWatts: 1000, peakWatts: undefined, freqLow: 44, freqHigh: 20000, coverageH: 90, coverageV: 18, weight: 25,
      cabinetType: "line-array", dimensionsM: { width: 0.594, height: 0.381, depth: 0.422 }, powerKind: "amplifier-module" } },
  "qsc-k10-2": { source: "https://www.qscaudio.com/products-solutions/loudspeakers/portable/powered/portable-pa/k2-series/k102/", conditions: "SPL pico a 1 m. Módulo anunciado como 2000 W, no potencia continua del altavoz.",
    values: { splMax: 130, rmsWatts: undefined, peakWatts: 2000, powerKind: "amplifier-module" } },
  "crown-xls2502": { source: crown, conditions: "Potencia por canal, modo dual: 440 W/8 ohm, 775 W/4 ohm, 1200 W/2 ohm. Ganancia y sensibilidad deben verificarse en el equipo.",
    values: { rmsWatts: undefined, peakWatts: undefined, channels: 2, minimumLoadOhms: 2,
      powerRatings: [{ watts: 440, ohms: 8, mode: "dual" }, { watts: 775, ohms: 4, mode: "dual" }, { watts: 1200, ohms: 2, mode: "dual" }], powerKind: "per-channel" } },
};

export function withCatalogMetadata(items: GearItem[]): GearItem[] {
  return items.map(item => {
    const fix = corrections[item.id];
    return { ...item, ...fix?.values, catalog: { revision: CATALOG_REVISION, status: fix ? "reviewed-fields" : "unverified",
      sources: fix ? [fix.source] : [], reviewedFields: fix ? Object.keys(fix.values) : [],
      conditions: fix?.conditions ?? "Ficha heredada sin contraste documental por campo. Confirmar especificaciones antes de configurar protección." } };
  });
}

export function catalogStatus(item: GearItem): string {
  return item.catalog?.status === "reviewed-fields" ? "Revisión parcial documentada" : item.catalog?.status === "technician" ? "Declarado por técnico" : "Ficha pendiente de revisión";
}
