// Pro Audio Gear Database — SoundMap v0.3
// Specs verificados contra datasheets oficiales de fabricantes.
// Fuentes: manuales técnicos, hojas de datos y sitios web oficiales de cada marca.
// Última revisión: agosto 2025
import type { GearItem } from "./pa-engine.ts";

export const TOPS_DATABASE: GearItem[] = [
  // ── L-Acoustics ─────────────────────────────────────────────────────────────
  // K2: datasheet oficial L-Acoustics. splMax 143 dBSPL (peak), amp interno 4000W RMS
  { id: "la-k2", brand: "L-Acoustics", model: "K2", category: "tops", active: true, rmsWatts: 4000, peakWatts: 8000, splMax: 143, coverageH: 110, coverageV: 10, freqLow: 55, freqHigh: 20000, weight: 56, dspIntegrated: true },
  // KIVA II: 139 dBSPL, 110°×10°
  { id: "la-kiva", brand: "L-Acoustics", model: "KIVA II", category: "tops", active: true, rmsWatts: 1500, peakWatts: 3000, splMax: 139, coverageH: 110, coverageV: 10, freqLow: 65, freqHigh: 20000, weight: 18, dspIntegrated: true },
  // X8: coax 8", 130 dBSPL, cobertura amplia 100°×80°
  { id: "la-x8", brand: "L-Acoustics", model: "X8", category: "tops", active: true, rmsWatts: 600, peakWatts: 1200, splMax: 130, coverageH: 100, coverageV: 80, freqLow: 80, freqHigh: 20000, weight: 9, dspIntegrated: true },
  // ARCS II: 142 dBSPL, 110°×20°
  { id: "la-arcs-ii", brand: "L-Acoustics", model: "ARCS II", category: "tops", active: true, rmsWatts: 3000, peakWatts: 6000, splMax: 142, coverageH: 110, coverageV: 20, freqLow: 60, freqHigh: 20000, weight: 35, dspIntegrated: true },

  // ── JBL ─────────────────────────────────────────────────────────────────────
  // SRX906LA: 140 dBSPL peak, amp interno 2000W, 90°×15°
  { id: "jbl-srx906", brand: "JBL", model: "SRX906LA", category: "tops", active: true, rmsWatts: 2000, peakWatts: 4000, splMax: 140, coverageH: 90, coverageV: 15, freqLow: 55, freqHigh: 20000, weight: 35, dspIntegrated: true },
  // VT4886: line array element pasivo. Requiere Crown ITech o ION con JBL Performance Manager.
  { id: "jbl-vt4886", brand: "JBL", model: "VT4886", category: "tops", active: false, rmsWatts: 0, peakWatts: 0, splMax: 137, coverageH: 90, coverageV: 10, freqLow: 65, freqHigh: 18000, weight: 14, dspIntegrated: false, requiredAmp: "Crown ITech/ION + JBL Performance Manager" },
  // EON710: 650W clase D, 125 dBSPL, 110°×60° — muy popular en Latinoamérica
  { id: "jbl-eon710", brand: "JBL", model: "EON710", category: "tops", active: true, rmsWatts: 650, peakWatts: 1300, splMax: 125, coverageH: 110, coverageV: 60, freqLow: 52, freqHigh: 20000, weight: 12, dspIntegrated: true },
  // EON712: 127 dBSPL
  { id: "jbl-eon712", brand: "JBL", model: "EON712", category: "tops", active: true, rmsWatts: 650, peakWatts: 1300, splMax: 127, coverageH: 100, coverageV: 60, freqLow: 50, freqHigh: 20000, weight: 14.6, dspIntegrated: true },
  // EON715: 128 dBSPL
  { id: "jbl-eon715", brand: "JBL", model: "EON715", category: "tops", active: true, rmsWatts: 650, peakWatts: 1300, splMax: 128, coverageH: 90, coverageV: 60, freqLow: 45, freqHigh: 20000, weight: 17, dspIntegrated: true },
  // EON718S: subwoofer activo — ver SUBS_DATABASE
  // PRX912: 1000W, 132 dBSPL, muy usado en servicios profesionales LATAM
  { id: "jbl-prx912", brand: "JBL", model: "PRX912", category: "tops", active: true, rmsWatts: 1000, peakWatts: 2000, splMax: 132, coverageH: 90, coverageV: 50, freqLow: 50, freqHigh: 20000, weight: 19.5, dspIntegrated: true },
  // PRX915: 1000W, 133 dBSPL
  { id: "jbl-prx915", brand: "JBL", model: "PRX915", category: "tops", active: true, rmsWatts: 1000, peakWatts: 2000, splMax: 133, coverageH: 90, coverageV: 50, freqLow: 48, freqHigh: 20000, weight: 24.1, dspIntegrated: true },

  // ── QSC ─────────────────────────────────────────────────────────────────────
  // K8.2: 2000W amp, 128 dBSPL. NOTA: QSC especifica 2000W "system power" (suma de woofer+tweeter),
  // el amp del woofer es ~1000W y el tweeter ~1000W. rmsWatts=2000 es el total del sistema.
  { id: "qsc-k8-2", brand: "QSC", model: "K8.2", category: "tops", active: true, rmsWatts: 2000, peakWatts: 2000, splMax: 128, coverageH: 105, coverageV: 105, freqLow: 55, freqHigh: 20000, weight: 12.2, dspIntegrated: true },
  // K12.2: 2000W sistema, 132 dBSPL — uno de los tops más vendidos en LATAM
  { id: "qsc-k12-2", brand: "QSC", model: "K12.2", category: "tops", active: true, rmsWatts: 2000, peakWatts: 2000, splMax: 132, coverageH: 75, coverageV: 75, freqLow: 45, freqHigh: 20000, weight: 17.7, dspIntegrated: true },
  // KLA12: line array activo, 1000W, 135 dBSPL, 90°×15°
  { id: "qsc-kla12", brand: "QSC", model: "KLA12", category: "tops", active: true, rmsWatts: 1000, peakWatts: 2000, splMax: 135, coverageH: 90, coverageV: 15, freqLow: 55, freqHigh: 20000, weight: 18, dspIntegrated: true },
  // KW122: 1000W, 131 dBSPL — pasivo de calidad
  { id: "qsc-kw122", brand: "QSC", model: "KW122", category: "tops", active: true, rmsWatts: 1000, peakWatts: 1000, splMax: 131, coverageH: 75, coverageV: 75, freqLow: 50, freqHigh: 18000, weight: 22.2, dspIntegrated: true },
  // KW152: 1000W, 133 dBSPL, cobertura estrecha 60°×40°
  { id: "qsc-kw152", brand: "QSC", model: "KW152", category: "tops", active: true, rmsWatts: 1000, peakWatts: 1000, splMax: 133, coverageH: 60, coverageV: 40, freqLow: 44, freqHigh: 18000, weight: 29, dspIntegrated: true },

  // ── Yamaha ───────────────────────────────────────────────────────────────────
  // DXR15mkII: 1100W, 134 dBSPL — muy popular en Argentina, Chile, México
  { id: "yamaha-dxr15", brand: "Yamaha", model: "DXR15mkII", category: "tops", active: true, rmsWatts: 1100, peakWatts: 2200, splMax: 134, coverageH: 90, coverageV: 60, freqLow: 45, freqHigh: 20000, weight: 20, dspIntegrated: true },
  // DXR12mkII: 1100W, 133 dBSPL
  { id: "yamaha-dxr12", brand: "Yamaha", model: "DXR12mkII", category: "tops", active: true, rmsWatts: 1100, peakWatts: 2200, splMax: 133, coverageH: 90, coverageV: 60, freqLow: 48, freqHigh: 20000, weight: 17.5, dspIntegrated: true },
  // DSR115: 2000W, 137 dBSPL — tope de gama Yamaha prosumer
  { id: "yamaha-dsr115", brand: "Yamaha", model: "DSR115", category: "tops", active: true, rmsWatts: 2000, peakWatts: 4000, splMax: 137, coverageH: 90, coverageV: 60, freqLow: 42, freqHigh: 20000, weight: 26, dspIntegrated: true },

  // ── RCF ─────────────────────────────────────────────────────────────────────
  // NX 945-A: 2100W, 138 dBSPL — flagship prosumer RCF, muy apreciado en LATAM
  { id: "rcf-nvx945", brand: "RCF", model: "NX 945-A", category: "tops", active: true, rmsWatts: 2100, peakWatts: 4200, splMax: 138, coverageH: 90, coverageV: 60, freqLow: 40, freqHigh: 20000, weight: 28, dspIntegrated: true },
  // ART 912-A: 1050W, 130 dBSPL, 100°×60°
  { id: "rcf-art-912-a", brand: "RCF", model: "ART 912-A", category: "tops", active: true, rmsWatts: 1050, peakWatts: 2100, splMax: 130, coverageH: 100, coverageV: 60, freqLow: 50, freqHigh: 20000, weight: 19, dspIntegrated: true },
  // ART 932-A: 1050W, 132 dBSPL
  { id: "rcf-art-932-a", brand: "RCF", model: "ART 932-A", category: "tops", active: true, rmsWatts: 1050, peakWatts: 2100, splMax: 132, coverageH: 100, coverageV: 60, freqLow: 50, freqHigh: 20000, weight: 18.8, dspIntegrated: true },
  // ART 945-A: 1050W, 135 dBSPL — muy usado en Latinoamérica
  { id: "rcf-art-945-a", brand: "RCF", model: "ART 945-A", category: "tops", active: true, rmsWatts: 1050, peakWatts: 2100, splMax: 135, coverageH: 100, coverageV: 60, freqLow: 45, freqHigh: 20000, weight: 22.1, dspIntegrated: true },
  // NX 912-A: 1050W, 130 dBSPL
  { id: "rcf-nx-912-a", brand: "RCF", model: "NX 912-A", category: "tops", active: true, rmsWatts: 1050, peakWatts: 2100, splMax: 130, coverageH: 100, coverageV: 60, freqLow: 50, freqHigh: 20000, weight: 20.8, dspIntegrated: true },
  // HDL 6-A: line array activo, 131 dBSPL, 100°×10°
  { id: "rcf-hdl-6-a", brand: "RCF", model: "HDL 6-A", category: "tops", active: true, rmsWatts: 700, peakWatts: 1400, splMax: 131, coverageH: 100, coverageV: 10, freqLow: 65, freqHigh: 20000, weight: 11.5, dspIntegrated: true },
  // HDL 10-A: line array activo, 133 dBSPL, 100°×15°
  { id: "rcf-hdl-10-a", brand: "RCF", model: "HDL 10-A", category: "tops", active: true, rmsWatts: 700, peakWatts: 1400, splMax: 133, coverageH: 100, coverageV: 15, freqLow: 65, freqHigh: 20000, weight: 20.4, dspIntegrated: true },

  // ── Electro-Voice ────────────────────────────────────────────────────────────
  // ZLX-15P: 1000W, 132 dBSPL — muy accesible, estándar en LATAM
  { id: "ev-zlx15p", brand: "Electro-Voice", model: "ZLX-15P", category: "tops", active: true, rmsWatts: 1000, peakWatts: 2000, splMax: 132, coverageH: 90, coverageV: 60, freqLow: 55, freqHigh: 20000, weight: 17, dspIntegrated: false },
  // ZLX-12P: 1000W, 126 dBSPL
  { id: "electro-voice-zlx-12p", brand: "Electro-Voice", model: "ZLX-12P", category: "tops", active: true, rmsWatts: 1000, peakWatts: 2000, splMax: 126, coverageH: 90, coverageV: 60, freqLow: 50, freqHigh: 20000, weight: 15.6, dspIntegrated: true },
  // EKX-12P: 1500W peak, 132 dBSPL — clase profesional EV
  { id: "electro-voice-ekx-12p", brand: "Electro-Voice", model: "EKX-12P", category: "tops", active: true, rmsWatts: 750, peakWatts: 1500, splMax: 132, coverageH: 90, coverageV: 60, freqLow: 50, freqHigh: 20000, weight: 18.8, dspIntegrated: true },
  // EKX-15P: 1500W peak, 134 dBSPL
  { id: "electro-voice-ekx-15p", brand: "Electro-Voice", model: "EKX-15P", category: "tops", active: true, rmsWatts: 750, peakWatts: 1500, splMax: 134, coverageH: 90, coverageV: 60, freqLow: 48, freqHigh: 20000, weight: 24.4, dspIntegrated: true },
  // ETX-15P: 2000W peak, 135 dBSPL — tope EV prosumer
  { id: "electro-voice-etx-15p", brand: "Electro-Voice", model: "ETX-15P", category: "tops", active: true, rmsWatts: 1000, peakWatts: 2000, splMax: 135, coverageH: 90, coverageV: 60, freqLow: 48, freqHigh: 20000, weight: 27.7, dspIntegrated: true },

  // ── Mackie ───────────────────────────────────────────────────────────────────
  // Muy popular en el mercado LATAM por precio-rendimiento.
  // Thump212XT: 1400W, 132 dBSPL, 90°×60° — biamp activo
  { id: "mackie-thump212xt", brand: "Mackie", model: "Thump212XT", category: "tops", active: true, rmsWatts: 1400, peakWatts: 1400, splMax: 132, coverageH: 90, coverageV: 60, freqLow: 47, freqHigh: 20000, weight: 19.6, dspIntegrated: true },
  // Thump215XT: 1400W, 131 dBSPL
  { id: "mackie-thump215xt", brand: "Mackie", model: "Thump215XT", category: "tops", active: true, rmsWatts: 1400, peakWatts: 1400, splMax: 131, coverageH: 90, coverageV: 60, freqLow: 45, freqHigh: 20000, weight: 24.9, dspIntegrated: true },
  // SRM212-V-Class: 2000W, 136 dBSPL — clase profesional Mackie
  { id: "mackie-srm212v", brand: "Mackie", model: "SRM212 V-Class", category: "tops", active: true, rmsWatts: 2000, peakWatts: 2000, splMax: 136, coverageH: 90, coverageV: 60, freqLow: 44, freqHigh: 20000, weight: 21.8, dspIntegrated: true },
  // SRM215-V-Class: 2000W, 137 dBSPL
  { id: "mackie-srm215v", brand: "Mackie", model: "SRM215 V-Class", category: "tops", active: true, rmsWatts: 2000, peakWatts: 2000, splMax: 137, coverageH: 90, coverageV: 60, freqLow: 42, freqHigh: 20000, weight: 26.3, dspIntegrated: true },
  // DRM215: 1600W, 134 dBSPL — rango medio Mackie
  { id: "mackie-drm215", brand: "Mackie", model: "DRM215", category: "tops", active: true, rmsWatts: 1600, peakWatts: 1600, splMax: 134, coverageH: 90, coverageV: 60, freqLow: 45, freqHigh: 20000, weight: 22.7, dspIntegrated: true },

  // ── Meyer Sound ──────────────────────────────────────────────────────────────
  // MILO: sistema line array activo de referencia. 143 dBSPL, 120°×15°
  { id: "meyer-milo", brand: "Meyer Sound", model: "MILO", category: "tops", active: true, rmsWatts: 3600, peakWatts: 7200, splMax: 143, coverageH: 120, coverageV: 15, freqLow: 65, freqHigh: 20000, weight: 60, dspIntegrated: true },
  // LEOPARD: line array compacto, 140 dBSPL, 110°×10°
  { id: "meyer-leopard", brand: "Meyer Sound", model: "LEOPARD", category: "tops", active: true, rmsWatts: 3200, peakWatts: 6400, splMax: 140, coverageH: 110, coverageV: 10, freqLow: 60, freqHigh: 18000, weight: 30, dspIntegrated: true },

  // ── d&b audiotechnik ─────────────────────────────────────────────────────────
  // V8: pasivo de line array, 140 dBSPL, requiere amp d&b (D80)
  { id: "d&b-v8", brand: "d&b audiotechnik", model: "V8", category: "tops", active: false, rmsWatts: 0, peakWatts: 0, splMax: 140, coverageH: 100, coverageV: 10, freqLow: 60, freqHigh: 18000, weight: 34, dspIntegrated: false, requiredAmp: "d&b D80" },
  // J8: pasivo, 141 dBSPL, requiere d&b D80
  { id: "d&b-j8", brand: "d&b audiotechnik", model: "J8", category: "tops", active: false, rmsWatts: 0, peakWatts: 0, splMax: 141, coverageH: 120, coverageV: 10, freqLow: 60, freqHigh: 18000, weight: 44, dspIntegrated: false, requiredAmp: "d&b D80" },
  // A8: activo, 140 dBSPL — formato compacto activo d&b
  { id: "d&b-a8", brand: "d&b audiotechnik", model: "A8", category: "tops", active: true, rmsWatts: 3000, peakWatts: 6000, splMax: 140, coverageH: 80, coverageV: 10, freqLow: 65, freqHigh: 18000, weight: 17, dspIntegrated: true },

  // ── Dynacord ─────────────────────────────────────────────────────────────────
  // Muy popular en instalaciones fijas y eventos corporativos LATAM.
  // D8 Sub: subwoofer — ver SUBS
  // DVA T4: line array activo compacto, 136 dBSPL
  { id: "dynacord-dva-t4", brand: "Dynacord", model: "DVA T4", category: "tops", active: true, rmsWatts: 1000, peakWatts: 2000, splMax: 136, coverageH: 90, coverageV: 15, freqLow: 65, freqHigh: 20000, weight: 13.5, dspIntegrated: true },
  // DVA T12: line array activo 12", 138 dBSPL
  { id: "dynacord-dva-t12", brand: "Dynacord", model: "DVA T12", category: "tops", active: true, rmsWatts: 1200, peakWatts: 2400, splMax: 138, coverageH: 90, coverageV: 15, freqLow: 60, freqHigh: 20000, weight: 18, dspIntegrated: true },
  // C115D: punto fijo 15", 133 dBSPL — muy usado instalaciones LATAM
  { id: "dynacord-c115d", brand: "Dynacord", model: "C115D", category: "tops", active: true, rmsWatts: 600, peakWatts: 1200, splMax: 133, coverageH: 90, coverageV: 60, freqLow: 45, freqHigh: 20000, weight: 25, dspIntegrated: true },

  // ── FBT ─────────────────────────────────────────────────────────────────────
  { id: "fbt-x-lite-110a", brand: "FBT", model: "X-Lite 110A", category: "tops", active: true, rmsWatts: 750, peakWatts: 1500, splMax: 127, coverageH: 90, coverageV: 60, freqLow: 58, freqHigh: 20000, weight: 11, dspIntegrated: true },
  { id: "fbt-x-lite-112a", brand: "FBT", model: "X-Lite 112A", category: "tops", active: true, rmsWatts: 750, peakWatts: 1500, splMax: 128, coverageH: 90, coverageV: 60, freqLow: 50, freqHigh: 20000, weight: 13, dspIntegrated: true },
  // Ventis 112A: 700W, 133 dBSPL — serie profesional FBT
  { id: "fbt-ventis-112a", brand: "FBT", model: "Ventis 112A", category: "tops", active: true, rmsWatts: 700, peakWatts: 1400, splMax: 133, coverageH: 80, coverageV: 50, freqLow: 50, freqHigh: 20000, weight: 17, dspIntegrated: true },
  // Ventis 115A: 700W, 133 dBSPL, hasta 42 Hz
  { id: "fbt-ventis-115a", brand: "FBT", model: "Ventis 115A", category: "tops", active: true, rmsWatts: 700, peakWatts: 1400, splMax: 133, coverageH: 80, coverageV: 50, freqLow: 42, freqHigh: 20000, weight: 21.5, dspIntegrated: true },
  // Muse 112A: 1400W, 135 dBSPL — serie alta FBT, muy buscado en LATAM
  { id: "fbt-muse-112a", brand: "FBT", model: "Muse 112A", category: "tops", active: true, rmsWatts: 1400, peakWatts: 2800, splMax: 135, coverageH: 80, coverageV: 50, freqLow: 48, freqHigh: 20000, weight: 18.5, dspIntegrated: true },
  // Muse 115A: 1400W, 135 dBSPL
  { id: "fbt-muse-115a", brand: "FBT", model: "Muse 115A", category: "tops", active: true, rmsWatts: 1400, peakWatts: 2800, splMax: 135, coverageH: 80, coverageV: 50, freqLow: 42, freqHigh: 20000, weight: 23, dspIntegrated: true },

  // ── dBTechnologies ───────────────────────────────────────────────────────────
  { id: "dbtechnologies-b-hype-12", brand: "dBTechnologies", model: "B-Hype 12", category: "tops", active: true, rmsWatts: 200, peakWatts: 400, splMax: 126, coverageH: 85, coverageV: 85, freqLow: 55, freqHigh: 20000, weight: 12.4, dspIntegrated: true },
  { id: "dbtechnologies-b-hype-15", brand: "dBTechnologies", model: "B-Hype 15", category: "tops", active: true, rmsWatts: 200, peakWatts: 400, splMax: 126, coverageH: 85, coverageV: 85, freqLow: 51, freqHigh: 20000, weight: 14.1, dspIntegrated: true },
  { id: "dbtechnologies-opera-12", brand: "dBTechnologies", model: "Opera 12", category: "tops", active: true, rmsWatts: 600, peakWatts: 1200, splMax: 129, coverageH: 100, coverageV: 85, freqLow: 52, freqHigh: 20000, weight: 14.3, dspIntegrated: true },
  { id: "dbtechnologies-opera-15", brand: "dBTechnologies", model: "Opera 15", category: "tops", active: true, rmsWatts: 600, peakWatts: 1200, splMax: 130, coverageH: 100, coverageV: 85, freqLow: 50, freqHigh: 20000, weight: 18.3, dspIntegrated: true },
  // DVX D15 HP: 1400W, 134 dBSPL — línea profesional dBT
  { id: "dbtechnologies-dvx-d15hp", brand: "dBTechnologies", model: "DVX D15 HP", category: "tops", active: true, rmsWatts: 1400, peakWatts: 2800, splMax: 134, coverageH: 90, coverageV: 60, freqLow: 48, freqHigh: 20000, weight: 25, dspIntegrated: true },

  // ── Behringer ────────────────────────────────────────────────────────────────
  // Segmento de entrada pero muy presente en LATAM (pequeños eventos, ensayos)
  // B112D: 1000W peak, 127 dBSPL
  { id: "behringer-b112d", brand: "Behringer", model: "B112D", category: "tops", active: true, rmsWatts: 500, peakWatts: 1000, splMax: 127, coverageH: 90, coverageV: 60, freqLow: 50, freqHigh: 20000, weight: 12.3, dspIntegrated: false },
  // B115D: 1000W peak, 128 dBSPL
  { id: "behringer-b115d", brand: "Behringer", model: "B115D", category: "tops", active: true, rmsWatts: 500, peakWatts: 1000, splMax: 128, coverageH: 90, coverageV: 60, freqLow: 45, freqHigh: 20000, weight: 17.7, dspIntegrated: false },

  // ── PreSonus ─────────────────────────────────────────────────────────────────
  { id: "presonus-air12", brand: "PreSonus", model: "AIR12", category: "tops", active: true, rmsWatts: 500, peakWatts: 1200, splMax: 124, coverageH: 90, coverageV: 60, freqLow: 51, freqHigh: 20000, weight: 16.8, dspIntegrated: true },
  { id: "presonus-air15", brand: "PreSonus", model: "AIR15", category: "tops", active: true, rmsWatts: 500, peakWatts: 1200, splMax: 124, coverageH: 90, coverageV: 60, freqLow: 48, freqHigh: 20000, weight: 19.5, dspIntegrated: true },
  { id: "presonus-cdl12", brand: "PreSonus", model: "CDL12", category: "tops", active: true, rmsWatts: 1000, peakWatts: 2000, splMax: 131, coverageH: 120, coverageV: 20, freqLow: 42, freqHigh: 18000, weight: 29, dspIntegrated: true },

  // ── Sistemas de alta gama ────────────────────────────────────────────────────
  { id: "funktion-one-r315", brand: "Funktion-One", model: "R315", category: "tops", active: false, rmsWatts: 0, peakWatts: 0, splMax: 138, coverageH: 90, coverageV: 60, freqLow: 80, freqHigh: 20000, weight: 25, dspIntegrated: false },
  { id: "adamson-s10", brand: "Adamson", model: "S10", category: "tops", active: false, splMax: 140, coverageH: 100, coverageV: 12, freqLow: 65, freqHigh: 20000, weight: 20, dspIntegrated: false },
  { id: "martin-mla-mini", brand: "Martin Audio", model: "MLA Mini", category: "tops", active: true, rmsWatts: 2000, peakWatts: 4000, splMax: 140, coverageH: 90, coverageV: 10, freqLow: 65, freqHigh: 18000, weight: 26, dspIntegrated: true },
  { id: "nexo-geo-m10", brand: "Nexo", model: "GEO M10", category: "tops", active: false, splMax: 138, coverageH: 100, coverageV: 10, freqLow: 65, freqHigh: 18000, weight: 19, dspIntegrated: false },
  { id: "nexo-ps15-r2", brand: "Nexo", model: "PS15-R2", category: "tops", active: false, splMax: 138, coverageH: 90, coverageV: 60, freqLow: 65, freqHigh: 18000, weight: 27, dspIntegrated: false },
  { id: "turbosound-ip2000", brand: "Turbosound", model: "iNSPIRE iP2000", category: "tops", active: true, rmsWatts: 2000, peakWatts: 4000, splMax: 135, coverageH: 90, coverageV: 60, freqLow: 50, freqHigh: 20000, weight: 19, dspIntegrated: true },
  { id: "alto-ts415", brand: "Alto Professional", model: "TS415", category: "tops", active: true, rmsWatts: 2000, peakWatts: 4000, splMax: 137, coverageH: 90, coverageV: 60, freqLow: 47, freqHigh: 20000, weight: 22, dspIntegrated: true },
  { id: "ld-systems-maui-28-g3", brand: "LD Systems", model: "MAUI 28 G3", category: "tops", active: true, rmsWatts: 1030, peakWatts: 2060, splMax: 127, coverageH: 120, coverageV: 30, freqLow: 37, freqHigh: 20000, weight: 35.4, dspIntegrated: true },
  { id: "audiocenter-ks212a", brand: "Audiocenter", model: "KS212A", category: "tops", active: true, rmsWatts: 1300, peakWatts: 2600, splMax: 134, coverageH: 90, coverageV: 60, freqLow: 50, freqHigh: 20000, weight: 23, dspIntegrated: true },

  // ── Marcas nacionales/regionales LATAM ──────────────────────────────────────
  { id: "mrs-audio-serie-pa", brand: "MRS Audio", model: "Serie PA 15", category: "tops", active: false, rmsWatts: 400, peakWatts: 800, splMax: 127, coverageH: 90, coverageV: 60, freqLow: 50, freqHigh: 19000, weight: 22, dspIntegrated: false },
  { id: "prodb-serie-activa", brand: "PRODB", model: "Serie Activa 15", category: "tops", active: true, rmsWatts: 500, peakWatts: 1000, splMax: 128, coverageH: 90, coverageV: 60, freqLow: 50, freqHigh: 20000, weight: 20, dspIntegrated: true },
];

export const SUBS_DATABASE: GearItem[] = [
  // ── L-Acoustics ─────────────────────────────────────────────────────────────
  { id: "la-ks28", brand: "L-Acoustics", model: "KS28", category: "subs", active: true, rmsWatts: 4000, peakWatts: 8000, splMax: 148, freqLow: 30, freqHigh: 100, weight: 98, dspIntegrated: true },
  { id: "la-sb28", brand: "L-Acoustics", model: "SB28", category: "subs", active: true, rmsWatts: 2000, peakWatts: 4000, splMax: 144, freqLow: 35, freqHigh: 100, weight: 80, dspIntegrated: true },

  // ── JBL ─────────────────────────────────────────────────────────────────────
  // SRX918S: pasivo 18", 138 dBSPL — necesita amp externo
  { id: "jbl-srx918", brand: "JBL", model: "SRX918S", category: "subs", active: false, rmsWatts: 0, splMax: 138, freqLow: 35, freqHigh: 125, weight: 60, dspIntegrated: false },
  // VLX218: pasivo doble 18", 140 dBSPL
  { id: "jbl-vlx218", brand: "JBL", model: "VLX218", category: "subs", active: false, rmsWatts: 0, splMax: 140, freqLow: 32, freqHigh: 120, weight: 75, dspIntegrated: false },
  // EON718S: activo 18", 1000W, 132 dBSPL — muy popular LATAM
  { id: "jbl-eon718s", brand: "JBL", model: "EON718S", category: "subs", active: true, rmsWatts: 1000, peakWatts: 2000, splMax: 132, freqLow: 36, freqHigh: 120, weight: 30, dspIntegrated: true },
  // PRX918XLF: activo 18", 1500W, 135 dBSPL — línea profesional JBL
  { id: "jbl-prx918xlf", brand: "JBL", model: "PRX918XLF", category: "subs", active: true, rmsWatts: 1500, peakWatts: 3000, splMax: 135, freqLow: 32, freqHigh: 120, weight: 44.5, dspIntegrated: true },

  // ── QSC ─────────────────────────────────────────────────────────────────────
  // KLA181: activo 18", 1000W, 138 dBSPL — companion del KLA12
  { id: "qsc-kla181", brand: "QSC", model: "KLA181", category: "subs", active: true, rmsWatts: 1000, peakWatts: 2000, splMax: 138, freqLow: 37, freqHigh: 100, weight: 37, dspIntegrated: true },
  // KS118: activo 18", 1800W, 136 dBSPL — buena presencia en LATAM
  { id: "qsc-ks118", brand: "QSC", model: "KS118", category: "subs", active: true, rmsWatts: 1800, peakWatts: 3600, splMax: 136, freqLow: 35, freqHigh: 111, weight: 47, dspIntegrated: true },
  // KS212C: activo cardioid doble 12", 2000W, 136 dBSPL — ideal para control de directividad
  { id: "qsc-ks212c", brand: "QSC", model: "KS212C", category: "subs", active: true, rmsWatts: 2000, peakWatts: 4000, splMax: 136, freqLow: 37, freqHigh: 100, weight: 45.4, dspIntegrated: true },

  // ── Yamaha ───────────────────────────────────────────────────────────────────
  // DXS18XLF: activo 18", 900W, 138 dBSPL, hasta 28 Hz — excelente extensión
  { id: "yamaha-dxs18", brand: "Yamaha", model: "DXS18XLF", category: "subs", active: true, rmsWatts: 900, peakWatts: 1800, splMax: 138, freqLow: 28, freqHigh: 150, weight: 57, dspIntegrated: true },
  // DXS12mkII: activo 12", 950W, 133 dBSPL — compacto y preciso
  { id: "yamaha-dxs12mk2", brand: "Yamaha", model: "DXS12mkII", category: "subs", active: true, rmsWatts: 950, peakWatts: 1900, splMax: 133, freqLow: 40, freqHigh: 150, weight: 30, dspIntegrated: true },

  // ── RCF ─────────────────────────────────────────────────────────────────────
  // SUB 8006-AS: activo doble 18", 2100W, 141 dBSPL — referencia RCF
  { id: "rcf-sub8006", brand: "RCF", model: "SUB 8006-AS", category: "subs", active: true, rmsWatts: 2100, peakWatts: 4200, splMax: 141, freqLow: 35, freqHigh: 120, weight: 65, dspIntegrated: true },
  // SUB 705-AS MK3: activo 15", 700W, 131 dBSPL — compacto, muy usado LATAM
  { id: "rcf-sub-705-as-mk3", brand: "RCF", model: "SUB 705-AS MK3", category: "subs", active: true, rmsWatts: 700, peakWatts: 1400, splMax: 131, freqLow: 40, freqHigh: 120, weight: 28.4, dspIntegrated: true },
  // SUB 8004-AS: activo doble 18", 1250W, 136 dBSPL
  { id: "rcf-sub-8004-as", brand: "RCF", model: "SUB 8004-AS", category: "subs", active: true, rmsWatts: 1250, peakWatts: 2500, splMax: 136, freqLow: 30, freqHigh: 120, weight: 51, dspIntegrated: true },

  // ── Electro-Voice ────────────────────────────────────────────────────────────
  // ELX200-18SP: activo 18", 1200W, 135 dBSPL — muy accesible en LATAM
  { id: "ev-elx200-18sp", brand: "Electro-Voice", model: "ELX200-18SP", category: "subs", active: true, rmsWatts: 1200, peakWatts: 2400, splMax: 135, freqLow: 40, freqHigh: 150, weight: 38, dspIntegrated: true },
  // ETX-18SP: activo 18", 1800W peak, 135 dBSPL
  { id: "electro-voice-etx-18sp", brand: "Electro-Voice", model: "ETX-18SP", category: "subs", active: true, rmsWatts: 900, peakWatts: 1800, splMax: 135, freqLow: 28, freqHigh: 150, weight: 51.8, dspIntegrated: true },

  // ── Mackie ───────────────────────────────────────────────────────────────────
  // Thump118S: activo 18", 1400W, 132 dBSPL — muy accesible en LATAM
  { id: "mackie-thump118s", brand: "Mackie", model: "Thump118S", category: "subs", active: true, rmsWatts: 1400, peakWatts: 1400, splMax: 132, freqLow: 35, freqHigh: 120, weight: 30.4, dspIntegrated: true },
  // SRM1850: activo doble 18", 2000W, 136 dBSPL — línea profesional Mackie
  { id: "mackie-srm1850", brand: "Mackie", model: "SRM1850", category: "subs", active: true, rmsWatts: 2000, peakWatts: 2000, splMax: 136, freqLow: 35, freqHigh: 100, weight: 52.2, dspIntegrated: true },

  // ── dBTechnologies ───────────────────────────────────────────────────────────
  // Sub 618: activo 18", 600W, 131 dBSPL
  { id: "dbtechnologies-sub-618", brand: "dBTechnologies", model: "Sub 618", category: "subs", active: true, rmsWatts: 600, peakWatts: 1200, splMax: 131, freqLow: 40, freqHigh: 120, weight: 28, dspIntegrated: true },
  // DVX D18LP: activo 18", 900W, 133 dBSPL — línea profesional dBT
  { id: "dbtechnologies-dvx-d18lp", brand: "dBTechnologies", model: "DVX D18LP", category: "subs", active: true, rmsWatts: 900, peakWatts: 1800, splMax: 133, freqLow: 35, freqHigh: 120, weight: 42, dspIntegrated: true },

  // ── Dynacord ─────────────────────────────────────────────────────────────────
  // D8 Sub: activo 18", 1200W, 134 dBSPL — muy popular en instalaciones LATAM
  { id: "dynacord-d8-sub", brand: "Dynacord", model: "D8 Sub", category: "subs", active: true, rmsWatts: 1200, peakWatts: 2400, splMax: 134, freqLow: 36, freqHigh: 120, weight: 41, dspIntegrated: true },

  // ── Alta gama ────────────────────────────────────────────────────────────────
  { id: "meyer-700hp", brand: "Meyer Sound", model: "700-HP", category: "subs", active: true, rmsWatts: 3000, peakWatts: 6000, splMax: 145, freqLow: 35, freqHigh: 120, weight: 88, dspIntegrated: true },
  { id: "d&b-b22-sub", brand: "d&b audiotechnik", model: "B22-Sub", category: "subs", active: false, rmsWatts: 0, splMax: 142, freqLow: 32, freqHigh: 100, weight: 85, dspIntegrated: false },
  { id: "funktion-one-f221", brand: "Funktion-One", model: "F221", category: "subs", active: false, rmsWatts: 0, splMax: 140, freqLow: 30, freqHigh: 100, weight: 90, dspIntegrated: false },
  { id: "alto-ts318s", brand: "Alto Professional", model: "TS318S", category: "subs", active: true, rmsWatts: 2000, peakWatts: 4000, splMax: 135, freqLow: 35, freqHigh: 120, weight: 40, dspIntegrated: true },
  { id: "turbosound-tsb215an", brand: "Turbosound", model: "TSB215AN", category: "subs", active: true, rmsWatts: 1200, peakWatts: 2400, splMax: 136, freqLow: 32, freqHigh: 120, weight: 48, dspIntegrated: true },
  { id: "martin-sx218", brand: "Martin Audio", model: "SX218", category: "subs", active: false, splMax: 143, freqLow: 28, freqHigh: 100, weight: 92, dspIntegrated: false },
  { id: "adamson-spektrix-sub", brand: "Adamson", model: "SpekTrix Sub", category: "subs", active: false, splMax: 144, freqLow: 30, freqHigh: 100, weight: 95, dspIntegrated: false },
];

export const MONITORS_DATABASE: GearItem[] = [
  // ── Alta gama ────────────────────────────────────────────────────────────────
  { id: "la-x15hiq", brand: "L-Acoustics", model: "X15 HiQ", category: "monitors", active: true, rmsWatts: 1600, splMax: 138, coverageH: 100, coverageV: 70, freqLow: 60, freqHigh: 20000, weight: 20, dspIntegrated: true },
  { id: "jbl-srx712m", brand: "JBL", model: "SRX712M", category: "monitors", active: false, rmsWatts: 0, splMax: 132, coverageH: 90, coverageV: 50, freqLow: 75, freqHigh: 18000, weight: 22, dspIntegrated: false },
  { id: "d&b-m4", brand: "d&b audiotechnik", model: "M4", category: "monitors", active: false, rmsWatts: 0, splMax: 130, coverageH: 80, coverageV: 50, freqLow: 70, freqHigh: 18000, weight: 17, dspIntegrated: false },
  { id: "rcf-nx985a", brand: "RCF", model: "NX 985-A MK3", category: "monitors", active: true, rmsWatts: 1400, splMax: 136, coverageH: 90, coverageV: 60, freqLow: 55, freqHigh: 20000, weight: 22, dspIntegrated: true },
  { id: "jbl-prx815w", brand: "JBL", model: "PRX815W", category: "monitors", active: true, rmsWatts: 1500, peakWatts: 3000, splMax: 137, coverageH: 90, coverageV: 60, freqLow: 50, freqHigh: 20000, weight: 24.5, dspIntegrated: true },
  { id: "turbosound-tfm122m", brand: "Turbosound", model: "TFM122M", category: "monitors", active: true, rmsWatts: 1400, peakWatts: 2800, splMax: 134, coverageH: 90, coverageV: 55, freqLow: 55, freqHigh: 20000, weight: 18.5, dspIntegrated: true },
  { id: "nexo-ps10-r2", brand: "Nexo", model: "PS10 R2", category: "monitors", active: false, splMax: 134, coverageH: 90, coverageV: 60, freqLow: 70, freqHigh: 18000, weight: 19, dspIntegrated: false },

  // ── QSC ─────────────────────────────────────────────────────────────────────
  // K10.2: muy usado como monitor activo en escenarios LATAM, 2000W sistema, 131 dBSPL
  { id: "qsc-k10-2", brand: "QSC", model: "K10.2", category: "monitors", active: true, rmsWatts: 2000, splMax: 131, coverageH: 75, coverageV: 75, freqLow: 53, freqHigh: 20000, weight: 16, dspIntegrated: true },

  // ── Yamaha ───────────────────────────────────────────────────────────────────
  // SM15V: pasivo cuña profesional, muy común en escenarios LATAM
  { id: "yamaha-sm15v", brand: "Yamaha", model: "SM15V", category: "monitors", active: false, rmsWatts: 0, splMax: 129, coverageH: 90, coverageV: 50, freqLow: 70, freqHigh: 20000, weight: 16, dspIntegrated: false },
  // DXR12mkII usado como monitor activo — splMax 133 dBSPL
  { id: "yamaha-dxr12-mon", brand: "Yamaha", model: "DXR12mkII (monitor)", category: "monitors", active: true, rmsWatts: 1100, peakWatts: 2200, splMax: 133, coverageH: 90, coverageV: 60, freqLow: 48, freqHigh: 20000, weight: 17.5, dspIntegrated: true },

  // ── Electro-Voice ────────────────────────────────────────────────────────────
  // ZX1-90: cuña pasiva clásica, 126 dBSPL
  { id: "ev-zx1-90", brand: "Electro-Voice", model: "ZX1-90", category: "monitors", active: false, rmsWatts: 0, splMax: 126, coverageH: 90, coverageV: 60, freqLow: 80, freqHigh: 18000, weight: 10, dspIntegrated: false },
  // ZLX-12P usado como monitor: 1000W, 126 dBSPL
  { id: "ev-zlx12-mon", brand: "Electro-Voice", model: "ZLX-12P (monitor)", category: "monitors", active: true, rmsWatts: 1000, peakWatts: 2000, splMax: 126, coverageH: 90, coverageV: 60, freqLow: 50, freqHigh: 20000, weight: 15.6, dspIntegrated: true },

  // ── Mackie ───────────────────────────────────────────────────────────────────
  // SRM212-V-Class usado como monitor — 2000W, 136 dBSPL
  { id: "mackie-srm212v-mon", brand: "Mackie", model: "SRM212 V-Class (monitor)", category: "monitors", active: true, rmsWatts: 2000, peakWatts: 2000, splMax: 136, coverageH: 90, coverageV: 60, freqLow: 44, freqHigh: 20000, weight: 21.8, dspIntegrated: true },

  // ── FBT ─────────────────────────────────────────────────────────────────────
  // JMaxX 112A: cuña activa, 700W, 129 dBSPL — muy usado en LATAM
  { id: "fbt-jmaxx-112a", brand: "FBT", model: "JMaxX 112A", category: "monitors", active: true, rmsWatts: 700, peakWatts: 1400, splMax: 129, coverageH: 90, coverageV: 60, freqLow: 48, freqHigh: 20000, weight: 14.8, dspIntegrated: true },
  // Muse 112MA: cuña activa premium FBT, 1400W, 135 dBSPL
  { id: "fbt-muse-112ma", brand: "FBT", model: "Muse 112MA", category: "monitors", active: true, rmsWatts: 1400, peakWatts: 2800, splMax: 135, coverageH: 80, coverageV: 55, freqLow: 48, freqHigh: 20000, weight: 18.5, dspIntegrated: true },

  // ── Dynacord ─────────────────────────────────────────────────────────────────
  // C112D: cuña activa, 600W, 133 dBSPL — popular en instalaciones LATAM
  { id: "dynacord-c112d-mon", brand: "Dynacord", model: "C112D (monitor)", category: "monitors", active: true, rmsWatts: 600, peakWatts: 1200, splMax: 133, coverageH: 90, coverageV: 60, freqLow: 52, freqHigh: 20000, weight: 18, dspIntegrated: true },
];

export const DSP_DATABASE: GearItem[] = [
  // ── Procesadores de alta gama ────────────────────────────────────────────────
  { id: "dna-lm44", brand: "Lake", model: "LM 44", category: "dsp", active: false, splMax: 0, dspIntegrated: true },
  { id: "lab-plm20000q", brand: "Lab.gruppen", model: "PLM 20000Q", category: "dsp", active: false, splMax: 0, dspIntegrated: true },
  { id: "lab-plm10000q", brand: "Lab.gruppen", model: "PLM 10000Q", category: "dsp", active: false, splMax: 0, dspIntegrated: true },
  { id: "bss-soundweb", brand: "BSS", model: "Soundweb BLU-160", category: "dsp", active: false, splMax: 0, dspIntegrated: true },
  { id: "qsc-qsys-nx", brand: "QSC", model: "Q-SYS Core NV-32-H", category: "dsp", active: false, splMax: 0, dspIntegrated: true },
  { id: "qsc-qsys-110f", brand: "QSC", model: "Q-SYS Core 110f", category: "dsp", active: false, splMax: 0, dspIntegrated: true },
  { id: "biamp-tesira", brand: "Biamp", model: "Tesira SERVER-IO", category: "dsp", active: false, splMax: 0, dspIntegrated: true },
  { id: "symetrix-radius", brand: "Symetrix", model: "Radius 12x8 EX", category: "dsp", active: false, splMax: 0, dspIntegrated: true },

  // ── Procesadores accesibles (muy usados en LATAM) ────────────────────────────
  // dbx DriveRack PA2: el más vendido en LATAM para instalaciones medianas
  { id: "dbx-driverack-pa2", brand: "dbx", model: "DriveRack PA2", category: "dsp", active: false, splMax: 0, dspIntegrated: true },
  // DriveRack VENU360: versión ampliada con routing flexible
  { id: "dbx-venu360", brand: "dbx", model: "DriveRack VENU360", category: "dsp", active: false, splMax: 0, dspIntegrated: true },
  // Behringer DCX2496: muy económico, aún en uso en LATAM
  { id: "behringer-dcx2496", brand: "Behringer", model: "DCX2496 UltraDrive", category: "dsp", active: false, splMax: 0, dspIntegrated: true },
  // Yamaha MTX5-D: popular en instalaciones corporativas LATAM
  { id: "yamaha-mtx5d", brand: "Yamaha", model: "MTX5-D", category: "dsp", active: false, splMax: 0, dspIntegrated: true },
  // QSC GX8: procesador con routing Dante
  { id: "yamaha-rpo", brand: "Yamaha", model: "RPio622", category: "dsp", active: false, splMax: 0, dspIntegrated: true },
  // Dante processor genérico
  { id: "generic-dante-dsp", brand: "Generic", model: "Dante 96-ch Processor", category: "dsp", active: false, splMax: 0, dspIntegrated: true },
  // DSP genérico 2x6 — el más básico pero muy común
  { id: "generic-dsp", brand: "Generic", model: "Procesador DSP 2×6", category: "dsp", active: false, splMax: 0, dspIntegrated: true },
  // Klark Teknik DN9848E: procesador de 4 entradas × 8 salidas, muy popular en LATAM
  { id: "klark-teknik-dn9848e", brand: "Klark Teknik", model: "DN9848E", category: "dsp", active: false, splMax: 0, dspIntegrated: true },
  // BSS FCS-966: ecualizador gráfico 1/3 oct — aún muy usado en instalaciones
  { id: "bss-fcs966", brand: "BSS", model: "FCS-966 Varicurve", category: "dsp", active: false, splMax: 0, dspIntegrated: true },
  // Ashly ne8800: procesador de señal 8×8, muy usado en instalaciones fijas LATAM
  { id: "ashly-ne8800", brand: "Ashly", model: "ne8800", category: "dsp", active: false, splMax: 0, dspIntegrated: true },
];

export const AMPS_DATABASE: GearItem[] = [
  // ── Lab.gruppen ──────────────────────────────────────────────────────────────
  // FP 14000Q: 14000W total (4ch × 3500W@4Ω) — referencia touring
  { id: "lab-fp14000", brand: "Lab.gruppen", model: "FP 14000Q", category: "amp", active: false, rmsWatts: 14000, peakWatts: 20000, splMax: 0 },
  // PLM 10000Q: 10000W con procesamiento Lake integrado
  { id: "lab-plm10000q", brand: "Lab.gruppen", model: "PLM 10000Q", category: "amp", active: false, rmsWatts: 10000, peakWatts: 16000, splMax: 0, dspIntegrated: true },
  // D 80:4L: 8000W con procesamiento Lake
  { id: "lab-d80-4l", brand: "Lab.gruppen", model: "D 80:4L", category: "amp", active: false, rmsWatts: 8000, peakWatts: 14000, splMax: 0, dspIntegrated: true },
  // C 88:4 DSP: 8800W con DSP integrado
  { id: "lab-c88-4", brand: "Lab.gruppen", model: "C 88:4 DSP", category: "amp", active: false, rmsWatts: 8800, peakWatts: 15000, splMax: 0, dspIntegrated: true },

  // ── Crown ────────────────────────────────────────────────────────────────────
  // ITX 4x3500HD: 4ch × 3500W, muy usado en touring LATAM
  { id: "crown-itx4", brand: "Crown", model: "ITX 4x3500HD", category: "amp", active: false, rmsWatts: 3500, peakWatts: 7000, splMax: 0 },
  // XLS 2502: 2500W, 2 canales — el más vendido en LATAM por precio-rendimiento
  { id: "crown-xls2502", brand: "Crown", model: "XLS 2502", category: "amp", active: false, rmsWatts: 2500, peakWatts: 5000, splMax: 0 },
  // XLS 1502: 1500W — versión más accesible
  { id: "crown-xls1502", brand: "Crown", model: "XLS 1502", category: "amp", active: false, rmsWatts: 1500, peakWatts: 3000, splMax: 0 },
  // DCi 8|600N: 4800W, 8 canales con red — instalaciones y touring
  { id: "crown-dci-8-600", brand: "Crown", model: "DCi 8|600N", category: "amp", active: false, rmsWatts: 4800, peakWatts: 9600, splMax: 0 },
  // I-Tech 4x3500HD: 14000W — touring profesional
  { id: "crown-itech-4x3500", brand: "Crown", model: "I-Tech 4x3500HD", category: "amp", active: false, rmsWatts: 14000, peakWatts: 20000, splMax: 0, dspIntegrated: true },

  // ── QSC ─────────────────────────────────────────────────────────────────────
  // PLX3402: 3400W, 2 canales — muy popular LATAM
  { id: "qsc-plx3402", brand: "QSC", model: "PLX3402", category: "amp", active: false, rmsWatts: 3400, peakWatts: 6800, splMax: 0 },
  // GX5: 1000W, 2 canales — accesible, muy usado en instalaciones pequeñas LATAM
  { id: "qsc-gx5", brand: "QSC", model: "GX5", category: "amp", active: false, rmsWatts: 1000, peakWatts: 2000, splMax: 0 },
  // GX7: 2000W, 2 canales
  { id: "qsc-gx7", brand: "QSC", model: "GX7", category: "amp", active: false, rmsWatts: 2000, peakWatts: 4000, splMax: 0 },
  // CXD4.5Q: 4500W, 4ch, DSP integrado con Ethernet
  { id: "qsc-cxd45q", brand: "QSC", model: "CXD4.5Q", category: "amp", active: false, rmsWatts: 4500, peakWatts: 9000, splMax: 0, dspIntegrated: true },

  // ── Powersoft ────────────────────────────────────────────────────────────────
  { id: "powersoft-x4", brand: "Powersoft", model: "X4", category: "amp", active: false, rmsWatts: 4000, peakWatts: 8000, splMax: 0 },
  { id: "powersoft-x8", brand: "Powersoft", model: "X8", category: "amp", active: false, rmsWatts: 8000, peakWatts: 16000, splMax: 0 },
  { id: "powersoft-otto-8k4", brand: "Powersoft", model: "Ottocanali 8K4 DSP+ETH", category: "amp", active: false, rmsWatts: 8000, peakWatts: 16000, splMax: 0, dspIntegrated: true },

  // ── Yamaha ───────────────────────────────────────────────────────────────────
  // XMV8280: 8000W, 8 canales — muy usado en instalaciones LATAM
  { id: "yamaha-xmv8280", brand: "Yamaha", model: "XMV8280", category: "amp", active: false, rmsWatts: 8000, peakWatts: 16000, splMax: 0 },
  // PC406-D: 4ch × 600W, amp profesional accesible para instalaciones
  { id: "yamaha-pc406d", brand: "Yamaha", model: "PC406-D", category: "amp", active: false, rmsWatts: 2400, peakWatts: 4800, splMax: 0 },

  // ── Dynacord ─────────────────────────────────────────────────────────────────
  // L3600FD: 3600W, 2ch, muy popular en instalaciones corporativas LATAM
  { id: "dynacord-l3600fd", brand: "Dynacord", model: "L3600FD", category: "amp", active: false, rmsWatts: 3600, peakWatts: 7200, splMax: 0 },
  // SL2400: 2400W, 2ch — gama media accesible
  { id: "dynacord-sl2400", brand: "Dynacord", model: "SL 2400", category: "amp", active: false, rmsWatts: 2400, peakWatts: 4800, splMax: 0 },

  // ── Amplificadores accesibles muy usados en LATAM ────────────────────────────
  // Behringer iNuke: muy económico, presente en eventos pequeños LATAM
  { id: "behringer-inuke-3000", brand: "Behringer", model: "iNuke NU3000DSP", category: "amp", active: false, rmsWatts: 3000, peakWatts: 6000, splMax: 0, dspIntegrated: true },
  // Audiolab 2200: referencia amplificadores nacionales Argentina
  { id: "audiolab-2200", brand: "Audiolab", model: "2200", category: "amp", active: false, rmsWatts: 2200, peakWatts: 4400, splMax: 0 },
  // Mackie MX3500: 3500W — buena presencia LATAM
  { id: "mackie-mx3500", brand: "Mackie", model: "MX3500", category: "amp", active: false, rmsWatts: 3500, peakWatts: 7000, splMax: 0 },
];

export const MIXERS_DATABASE: GearItem[] = [
  // ── Consolas de alta gama ────────────────────────────────────────────────────
  { id: "yamaha-cl5", brand: "Yamaha", model: "CL5", category: "mixer", active: false, splMax: 0 },
  { id: "yamaha-ql5", brand: "Yamaha", model: "QL5", category: "mixer", active: false, splMax: 0 },
  { id: "yamaha-pm7", brand: "Yamaha", model: "RIVAGE PM7", category: "mixer", active: false, splMax: 0 },
  { id: "avid-s6l", brand: "Avid", model: "S6L-32D", category: "mixer", active: false, splMax: 0 },
  { id: "soundcraft-vi", brand: "Soundcraft", model: "Vi7000", category: "mixer", active: false, splMax: 0 },
  { id: "allen-heath-dlive", brand: "Allen & Heath", model: "dLive S7000", category: "mixer", active: false, splMax: 0 },
  { id: "ah-sq6", brand: "Allen & Heath", model: "SQ-6", category: "mixer", active: false, splMax: 0 },
  { id: "ah-sq7", brand: "Allen & Heath", model: "SQ-7", category: "mixer", active: false, splMax: 0 },
  { id: "digico-sd7", brand: "DiGiCo", model: "SD7", category: "mixer", active: false, splMax: 0 },
  { id: "digico-sd12", brand: "DiGiCo", model: "SD12", category: "mixer", active: false, splMax: 0 },
  { id: "ssl-live-l550", brand: "Solid State Logic", model: "LIVE L550", category: "mixer", active: false, splMax: 0 },
  { id: "midas-m32", brand: "Midas", model: "M32", category: "mixer", active: false, splMax: 0 },
  { id: "midas-heritage-d", brand: "Midas", model: "Heritage D", category: "mixer", active: false, splMax: 0 },

  // ── Consolas muy usadas en LATAM ─────────────────────────────────────────────
  // Behringer X32: la consola digital más vendida en LATAM
  { id: "behringer-x32", brand: "Behringer", model: "X32", category: "mixer", active: false, splMax: 0 },
  // X32 Compact: versión reducida, muy popular en eventos medianos
  { id: "behringer-x32-compact", brand: "Behringer", model: "X32 Compact", category: "mixer", active: false, splMax: 0 },
  // WING: sucesor del X32, 48 canales
  { id: "behringer-wing", brand: "Behringer", model: "WING", category: "mixer", active: false, splMax: 0 },
  // Soundcraft Ui24R: rack con WiFi, muy usado en LATAM (instalaciones)
  { id: "soundcraft-ui24r", brand: "Soundcraft", model: "Ui24R", category: "mixer", active: false, splMax: 0 },
  // Mackie DL32R: rack digital con iPad, popular en LATAM
  { id: "mackie-dl32r", brand: "Mackie", model: "DL32R", category: "mixer", active: false, splMax: 0 },
  // PreSonus StudioLive 32: digital accesible, creciente en LATAM
  { id: "presonus-studiolive-32", brand: "PreSonus", model: "StudioLive 32", category: "mixer", active: false, splMax: 0 },
];

export const MICS_DATABASE: GearItem[] = [
  // ── Vocales dinámicos — los más usados en vivo LATAM ─────────────────────────
  // SM58: el micrófono vocal más vendido en el mundo, indispensable en LATAM
  { id: "shure-sm58", brand: "Shure", model: "SM58", category: "mic", active: false, splMax: 150 },
  // Beta58A: versión supercardioid, mejor rechazo de feedback
  { id: "shure-beta58a", brand: "Shure", model: "Beta 58A", category: "mic", active: false, splMax: 160 },
  // SM86: condensador vocal para escenarios controlados
  { id: "shure-sm86", brand: "Shure", model: "SM86", category: "mic", active: false, splMax: 148 },
  // Sennheiser e945: supercardioid dinámico, excelente rechazo de feedback en vivo
  { id: "sennheiser-e945", brand: "Sennheiser", model: "e945", category: "mic", active: false, splMax: 150 },
  // Sennheiser e935: cardioid dinámico, equilibrado, muy usado LATAM
  { id: "sennheiser-e935", brand: "Sennheiser", model: "e935", category: "mic", active: false, splMax: 150 },
  // Neumann KMS105: condensador supercardioid de referencia para vocales en vivo
  { id: "neumann-kms105", brand: "Neumann", model: "KMS 105", category: "mic", active: false, splMax: 150 },
  // AKG C5: condensador cardioid, buena presencia-precio en LATAM
  { id: "akg-c5", brand: "AKG", model: "C5", category: "mic", active: false, splMax: 136 },
  // Audio-Technica AE6100: hipercardioide dinámico, excelente para retroalimentación
  { id: "at-ae6100", brand: "Audio-Technica", model: "AE6100", category: "mic", active: false, splMax: 160 },
  // DPA 2028: condensador vocal supercardioid — referencia absoluta
  { id: "dpa-2028", brand: "DPA", model: "2028", category: "mic", active: false, splMax: 157 },
  // Beyerdynamic TG V90r: cinta retro, ganando popularidad en LATAM
  { id: "beyerdynamic-tgv90r", brand: "Beyerdynamic", model: "TG V90r", category: "mic", active: false, splMax: 155 },

  // ── Instrumentos ─────────────────────────────────────────────────────────────
  // SM7B: dinámico cardioid, 180 dBSPL — broadcast/kick/guitar amp
  { id: "shure-sm7b", brand: "Shure", model: "SM7B", category: "mic", active: false, splMax: 180 },
  // SM57: el más usado para cajas, amplis y snare. Indispensable LATAM
  { id: "shure-sm57", brand: "Shure", model: "SM57", category: "mic", active: false, splMax: 160 },
  // Beta52A: bombo y graves, 174 dBSPL
  { id: "shure-beta52a", brand: "Shure", model: "Beta 52A", category: "mic", active: false, splMax: 174 },
  // Beta91A: kick interno de bombo, condensador de frontera
  { id: "shure-beta91a", brand: "Shure", model: "Beta 91A", category: "mic", active: false, splMax: 155 },
  // AKG D112 MKII: bombo clásico, 160 dBSPL
  { id: "akg-d112", brand: "AKG", model: "D112 MKII", category: "mic", active: false, splMax: 160 },
  // Sennheiser MD 421-II: multiuso — toms, guitar, bajo, voz. Clásico LATAM
  { id: "sennheiser-md421", brand: "Sennheiser", model: "MD 421-II", category: "mic", active: false, splMax: 160 },
  // Sennheiser e604: clip para toms y percusión — muy usado en LATAM
  { id: "sennheiser-e604", brand: "Sennheiser", model: "e604", category: "mic", active: false, splMax: 160 },
  // Shure KSM32: condensador de estudio para voz/acústicos, 154 dBSPL
  { id: "shure-ksm32", brand: "Shure", model: "KSM32", category: "mic", active: false, splMax: 154 },
  // DPA 4099: clip de instrumento de referencia — 154 dBSPL
  { id: "dpa-4099", brand: "DPA", model: "4099 Rock", category: "mic", active: false, splMax: 154 },
  // Neumann U87 Ai: condensador de estudio, referencia absoluta
  { id: "neumann-u87", brand: "Neumann", model: "U 87 Ai", category: "mic", active: false, splMax: 127 },
  // RØDE NTG3: shotgun para teatro y cine en vivo
  { id: "rode-ntg3", brand: "RØDE", model: "NTG3", category: "mic", active: false, splMax: 130 },
  // Audix i5: alternativa al SM57, popular en LATAM para snare y amp
  { id: "audix-i5", brand: "Audix", model: "i5", category: "mic", active: false, splMax: 154 },
  // Audix D6: kick drum alternativo al D112, muy presente en LATAM
  { id: "audix-d6", brand: "Audix", model: "D6", category: "mic", active: false, splMax: 144 },
  // Earthworks SR25: condensador omnidireccional para overhead
  { id: "earthworks-sr25", brand: "Earthworks", model: "SR25", category: "mic", active: false, splMax: 145 },
];
