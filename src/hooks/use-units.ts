// useUnits — Conversión métrico/imperial para SoundMap
// Los engines siempre calculan en métrico internamente.
// Este hook convierte y formatea valores en la capa de presentación.
//
// Conversiones usadas en pro audio:
//   longitud:  1 m = 3.28084 ft
//   distancia: ídem
//   área:      1 m² = 10.7639 ft²
//   volumen:   1 m³ = 35.3147 ft³
//   peso:      1 kg = 2.20462 lb

import { useSettingsStore } from "@/store/settings.ts";

const M_TO_FT  = 3.28084;
const M2_TO_FT2 = 10.7639;
const M3_TO_FT3 = 35.3147;
const KG_TO_LB  = 2.20462;

export function useUnits() {
  const units = useSettingsStore(s => s.units);
  const isImperial = units === "imperial";

  // ── Longitud (metros ↔ pies) ────────────────────────────────────────────────
  function fmtM(meters: number, _decimals = 1): string {
    if (!isImperial) return `${meters.toFixed(_decimals)} m`;
    const ft = meters * M_TO_FT;
    return `${ft.toFixed(_decimals)} ft`;
  }

  function fmtMShort(meters: number, _decimals = 1): string {
    if (!isImperial) return `${meters.toFixed(_decimals)}`;
    return `${(meters * M_TO_FT).toFixed(_decimals)}`;
  }

  function unitM(): string { return isImperial ? "ft" : "m"; }

  // ── Volumen (m³ ↔ ft³) ──────────────────────────────────────────────────────
  function fmtM3(m3: number, _decimals = 0): string {
    if (!isImperial) return `${Math.round(m3)} m³`;
    return `${Math.round(m3 * M3_TO_FT3).toLocaleString("es-AR")} ft³`;
  }

  function fmtM3Short(m3: number): string {
    return isImperial
      ? `${Math.round(m3 * M3_TO_FT3).toLocaleString("es-AR")}`
      : `${Math.round(m3).toLocaleString("es-AR")}`;
  }

  function unitM3(): string { return isImperial ? "ft³" : "m³"; }

  // ── Área (m² ↔ ft²) ─────────────────────────────────────────────────────────
  function fmtM2(m2: number, _decimals = 1): string {
    if (!isImperial) return `${m2.toFixed(_decimals)} m²`;
    return `${(m2 * M2_TO_FT2).toFixed(_decimals)} ft²`;
  }

  function unitM2(): string { return isImperial ? "ft²" : "m²"; }

  // ── Peso (kg ↔ lb) ──────────────────────────────────────────────────────────
  function fmtKg(kg: number, _decimals = 1): string {
    if (!isImperial) return `${kg.toFixed(_decimals)} kg`;
    return `${(kg * KG_TO_LB).toFixed(_decimals)} lb`;
  }

  function unitKg(): string { return isImperial ? "lb" : "kg"; }

  // ── Input: convierte valor ingresado por el usuario a metros ────────────────
  // Cuando el usuario escribe "10" en un campo ft, los engines reciben 3.048 m.
  function inputToMeters(value: number): number {
    return isImperial ? value / M_TO_FT : value;
  }

  // ── Display: convierte metros al sistema del usuario ─────────────────────────
  function metersToDisplay(meters: number, _decimals = 1): number {
    const v = isImperial ? meters * M_TO_FT : meters;
    return Math.round(v * Math.pow(10, _decimals)) / Math.pow(10, _decimals);
  }

  // ── Sufijo del campo de entrada de dimensiones ───────────────────────────────
  function inputSuffixM(): string { return isImperial ? "ft" : "m"; }
  function inputStepM(): number   { return isImperial ? 1 : 0.5; }
  function inputStepMInt(): number { return isImperial ? 3 : 1; }

  // ── Label corto para campos de dimensiones ───────────────────────────────────
  function labelLength(): string { return isImperial ? "Largo (ft)" : "Largo (m)"; }
  function labelWidth():  string { return isImperial ? "Ancho (ft)" : "Ancho (m)"; }
  function labelHeight(): string { return isImperial ? "Alto (ft)"  : "Alto (m)"; }

  // ── Distancia crítica ────────────────────────────────────────────────────────
  function fmtCriticalDistance(meters: number): string {
    return fmtM(meters, 1);
  }

  // Frecuencias y dB no cambian entre sistemas → solo helpers de formato
  function fmtHz(hz: number): string { return `${hz} Hz`; }
  function fmtDb(db: number, sign = false): string {
    return sign ? `${db >= 0 ? "+" : ""}${db} dB` : `${db} dB`;
  }
  function fmtMs(ms: number): string { return `${ms} ms`; }

  return {
    isImperial,
    units,
    // Metros
    fmtM, fmtMShort, unitM,
    metersToDisplay, inputToMeters,
    inputSuffixM, inputStepM, inputStepMInt,
    labelLength, labelWidth, labelHeight,
    // Volumen
    fmtM3, fmtM3Short, unitM3,
    // Área
    fmtM2, unitM2,
    // Peso
    fmtKg, unitKg,
    // Distancia crítica
    fmtCriticalDistance,
    // Sin cambio
    fmtHz, fmtDb, fmtMs,
  };
}
