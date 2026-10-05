import type { GearItem } from "./pa-engine";

export interface ProtectionChain {
  speakerId: string;
  amplifierId: string;
  amplifierUnit: number;
  channel: number;
  cabinetsInParallel: number;
  speakerContinuousWatts: number;
  speakerOhms: number;
  amplifierGainDb: number;
  outputTrimDb: number;
  dspFullScaleDbu: number;
  marginDb: number;
  source: string;
  verifiedBy: string;
  verifiedAt: string;
}
export type ProtectionResult = { status: "pending"; reasons: string[] } | {
  status: "calculated"; outputVrms: number; inputDbu: number; thresholdDbfs: number;
  loadOhms: number; amplifierWatts: number; reasons: string[];
};

/** Electrical ceiling under the explicit resistive-load assumption. Never infer
 * voltage, amplifier gain or dBFS from acoustic SPL, marketing watts or quantity.
 * A calculated ceiling is not a complete thermal/excursion protection preset.
 */
export function calculateElectricalProtection(speaker: GearItem, amplifier: GearItem | undefined, c?: ProtectionChain): ProtectionResult {
  const pending = (...reasons: string[]): ProtectionResult => ({ status: "pending", reasons });
  if (speaker.active) return pending("Caja autoamplificada: usar preset y límites del fabricante; no derivar limitador externo de SPL.");
  if (speaker.requiredAmp) return pending(`Sistema dedicado: ${speaker.requiredAmp}. Usar protección de fabricante.`);
  if (!c || !amplifier) return pending("Asignar etapa, unidad y canal y verificar toda la cadena eléctrica.");
  if (c.speakerId !== speaker.id || c.amplifierId !== amplifier.id) return pending("La asignación no corresponde al equipo.");
  if (!c.source.trim() || !c.verifiedBy.trim() || !Number.isFinite(Date.parse(c.verifiedAt))) return pending("Falta referencia documental, responsable o fecha.");
  if ([c.channel, c.amplifierUnit, c.cabinetsInParallel].some(n => !Number.isInteger(n) || n < 1) || c.channel > (amplifier.channels ?? 0) || c.amplifierUnit > (amplifier.quantity ?? 1)) return pending("Canal, unidad o número de cajas no válido.");
  if ([c.speakerContinuousWatts, c.speakerOhms, c.amplifierGainDb, c.outputTrimDb, c.dspFullScaleDbu, c.marginDb].some(n => !Number.isFinite(n)) || c.speakerContinuousWatts <= 0 || c.speakerOhms <= 0 || c.amplifierGainDb < 0 || c.amplifierGainDb > 60 || c.marginDb < 0 || c.marginDb > 30 || Math.abs(c.outputTrimDb) > 60) return pending("Valores eléctricos fuera de rango.");
  const loadOhms = c.speakerOhms / c.cabinetsInParallel;
  if (loadOhms < (amplifier.minimumLoadOhms ?? Infinity)) return pending("Carga no soportada o límite de carga desconocido.");
  const rating = amplifier.powerRatings?.find(r => r.mode === "dual" && Math.abs(r.ohms - loadOhms) < 0.01);
  if (!rating || !amplifier.catalog?.reviewedFields.includes("powerRatings")) return pending("No hay potencia por canal verificada para esa carga. No se interpola.");
  const outputVrms = Math.min(Math.sqrt(c.speakerContinuousWatts * c.speakerOhms), Math.sqrt(rating.watts * loadOhms)) * 10 ** (-c.marginDb / 20);
  const inputDbu = 20 * Math.log10(outputVrms / 0.775) - c.amplifierGainDb - c.outputTrimDb;
  const thresholdDbfs = inputDbu - c.dspFullScaleDbu;
  if (thresholdDbfs > 0 || thresholdDbfs < -100) return pending("El umbral excede el rango digital; revisar referencia de salida y ganancia.");
  return { status: "calculated", outputVrms, inputDbu, thresholdDbfs, loadOhms, amplifierWatts: rating.watts,
    reasons: ["Techo RMS calculado con carga resistiva nominal. Verificar tensión de salida en banco.", "Ataque, release, pico y excursión requieren preset o datos de fabricante; este cálculo no los valida."] };
}
