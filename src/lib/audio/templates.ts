// SoundMap — Service Templates
// Curated starting configurations for common venue types.
// Each template provides a room + gear pool matched to typical needs.
//
// Users can preview, load into current session, and then tweak.
import type { RoomScanInput } from "@/lib/audio/acoustics.ts";
import type { GearItem } from "@/lib/audio/pa-engine.ts";

export interface Template {
  id: string;
  name: string;
  category: "church" | "club" | "corporate" | "festival" | "theater";
  description: string;
  ideal: string[];       // bullet points describing when to use it
  serviceType: string;   // "Servicio dominical", "Concierto club", etc.
  color: string;         // hex color for tinted UI
  icon: string;          // emoji key for lookup (map to Lucide in UI)
  room: RoomScanInput;
  tops: GearItem[];
  subs: GearItem[];
  monitors: GearItem[];
  dspUnits: GearItem[];
  amps: GearItem[];
  mixers: GearItem[];
  mics: GearItem[];
}

// ── Helper factories ──────────────────────────────────────────────────────
const g = (item: GearItem): GearItem => ({ ...item, active: true, quantity: item.quantity ?? 1 });

// ── Templates ─────────────────────────────────────────────────────────────
export const TEMPLATES: Template[] = [
  {
    id: "church-sunday",
    name: "Iglesia · Servicio Dominical",
    category: "church",
    serviceType: "Domingo mañana",
    description: "Sistema orientado a claridad vocal, banda de worship y palabra hablada. Prioriza inteligibilidad sobre SPL.",
    ideal: [
      "Recinto de tamaño mediano (300–500 pax)",
      "Sermón + banda de worship",
      "Techo alto con superficies reflectantes",
      "Prioridad: inteligibilidad vocal",
    ],
    color: "#5EEAD4",
    icon: "church",
    room: {
      name: "Templo — Domingo Mañana",
      length: 25,
      width: 18,
      height: 7,
      capacity: 400,
      ceilingType: "flat",
      wallMaterial: "drywall",
      floorType: "carpet",
      windowCount: 6,
    },
    tops: [
      g({ id: "qsc-k12", brand: "QSC", model: "K12.2", category: "tops", active: true, rmsWatts: 2000, peakWatts: 4000, splMax: 132, coverageH: 90, coverageV: 60, freqLow: 56, freqHigh: 20000, weight: 18, dspIntegrated: true, quantity: 2 }),
    ],
    subs: [
      g({ id: "qsc-ks118", brand: "QSC", model: "KS118", category: "subs", active: true, rmsWatts: 1600, peakWatts: 3200, splMax: 136, coverageH: 360, coverageV: 360, freqLow: 33, freqHigh: 88, weight: 42, dspIntegrated: true, quantity: 2 }),
    ],
    monitors: [
      g({ id: "qsc-k10", brand: "QSC", model: "K10.2", category: "monitors", active: true, rmsWatts: 2000, splMax: 131, coverageH: 75, coverageV: 75, freqLow: 53, freqHigh: 20000, weight: 16, dspIntegrated: true, quantity: 4 }),
    ],
    dspUnits: [
      g({ id: "biamp-tesira", brand: "Biamp", model: "Tesira Forte", category: "dsp", active: true, splMax: 0, dspIntegrated: true }),
    ],
    amps: [],
    mixers: [
      g({ id: "yamaha-tf5", brand: "Yamaha", model: "TF5", category: "mixer", active: true, splMax: 0, dspIntegrated: false }),
    ],
    mics: [
      g({ id: "shure-sm58", brand: "Shure", model: "SM58", category: "mic", active: true, splMax: 155, dspIntegrated: false, quantity: 4 }),
      g({ id: "shure-beta91", brand: "Shure", model: "BETA 91A", category: "mic", active: true, splMax: 155, dspIntegrated: false, quantity: 1 }),
      g({ id: "sennheiser-e935", brand: "Sennheiser", model: "e 935", category: "mic", active: true, splMax: 155, dspIntegrated: false, quantity: 2 }),
    ],
  },

  {
    id: "club-300",
    name: "Club Nocturno · 300 pax",
    category: "club",
    serviceType: "Concierto club",
    description: "Sistema con SPL alto, subs cardioides y monitors potentes para DJs y bandas eléctricas.",
    ideal: [
      "Boliche o club chico-mediano",
      "DJ sets, tributos, bandas eléctricas",
      "Techo bajo, público bailando",
      "Prioridad: pegada de subs y presencia",
    ],
    color: "#FF3EA5",
    icon: "club",
    room: {
      name: "Warehouse Club",
      length: 22,
      width: 15,
      height: 4.5,
      capacity: 300,
      ceilingType: "industrial",
      wallMaterial: "brick",
      floorType: "concrete",
      windowCount: 0,
    },
    tops: [
      g({ id: "jbl-srx906", brand: "JBL", model: "SRX906LA", category: "tops", active: true, rmsWatts: 2000, peakWatts: 4000, splMax: 140, coverageH: 90, coverageV: 15, freqLow: 55, freqHigh: 20000, weight: 35, dspIntegrated: true, quantity: 4 }),
    ],
    subs: [
      g({ id: "qsc-kla181", brand: "QSC", model: "KLA181", category: "subs", active: true, rmsWatts: 1000, peakWatts: 2000, splMax: 138, coverageH: 360, coverageV: 360, freqLow: 37, freqHigh: 100, weight: 37, dspIntegrated: true, quantity: 4 }),
    ],
    monitors: [
      g({ id: "rcf-nx-45", brand: "RCF", model: "NX 45-A", category: "monitors", active: true, rmsWatts: 1000, splMax: 133, coverageH: 90, coverageV: 60, freqLow: 55, freqHigh: 20000, weight: 20, dspIntegrated: true, quantity: 4 }),
    ],
    dspUnits: [
      g({ id: "lab-lm44", brand: "Lab.gruppen", model: "LM 44", category: "dsp", active: true, splMax: 0, dspIntegrated: true }),
    ],
    amps: [
      g({ id: "lab-fp10000q", brand: "Lab.gruppen", model: "FP10000Q", category: "amp", active: true, rmsWatts: 10000, splMax: 0, dspIntegrated: false, quantity: 2 }),
    ],
    mixers: [
      g({ id: "midas-m32", brand: "Midas", model: "M32", category: "mixer", active: true, splMax: 0, dspIntegrated: false }),
    ],
    mics: [
      g({ id: "shure-sm58", brand: "Shure", model: "SM58", category: "mic", active: true, splMax: 155, dspIntegrated: false, quantity: 2 }),
      g({ id: "shure-beta52", brand: "Shure", model: "BETA 52A", category: "mic", active: true, splMax: 174, dspIntegrated: false, quantity: 1 }),
    ],
  },

  {
    id: "corporate-80",
    name: "Conferencia · 80 pax",
    category: "corporate",
    serviceType: "Evento corporativo",
    description: "Sistema pensado para voz clara, presentaciones AV y jazz/acústico de fondo.",
    ideal: [
      "Sala de conferencias o salón hotelero",
      "Panel, keynote, presentaciones AV",
      "Sala tratada con cielorraso acústico",
      "Prioridad: claridad y estética discreta",
    ],
    color: "#B794F6",
    icon: "corporate",
    room: {
      name: "Sala Conferencia",
      length: 15,
      width: 10,
      height: 3.5,
      capacity: 80,
      ceilingType: "acoustic-tile",
      wallMaterial: "drywall",
      floorType: "carpet",
      windowCount: 3,
    },
    tops: [
      g({ id: "qsc-k8", brand: "QSC", model: "K8.2", category: "tops", active: true, rmsWatts: 2000, peakWatts: 4000, splMax: 128, coverageH: 105, coverageV: 105, freqLow: 61, freqHigh: 20000, weight: 12, dspIntegrated: true, quantity: 2 }),
    ],
    subs: [],
    monitors: [
      g({ id: "yamaha-dxr8", brand: "Yamaha", model: "DXR8mkII", category: "monitors", active: true, rmsWatts: 1100, splMax: 129, coverageH: 100, coverageV: 90, freqLow: 55, freqHigh: 20000, weight: 13, dspIntegrated: true, quantity: 1 }),
    ],
    dspUnits: [
      g({ id: "biamp-tesira", brand: "Biamp", model: "Tesira Forte", category: "dsp", active: true, splMax: 0, dspIntegrated: true }),
    ],
    amps: [],
    mixers: [
      g({ id: "yamaha-tf3", brand: "Yamaha", model: "TF3", category: "mixer", active: true, splMax: 0, dspIntegrated: false }),
    ],
    mics: [
      g({ id: "shure-slxd", brand: "Shure", model: "SLXD24/SM58", category: "mic", active: true, splMax: 155, dspIntegrated: false, quantity: 4 }),
      g({ id: "sennheiser-mkh416", brand: "Sennheiser", model: "MKH 416", category: "mic", active: true, splMax: 130, dspIntegrated: false, quantity: 1 }),
    ],
  },

  {
    id: "festival-1500",
    name: "Festival Outdoor · 1,500 pax",
    category: "festival",
    serviceType: "Festival al aire libre",
    description: "PA de alto SPL con line arrays flyados, subs distribuidos y torres de delay para cobertura larga.",
    ideal: [
      "Escenario outdoor con audiencia amplia",
      "SPL objetivo 105-110 dB frontal",
      "Distancia >30m del escenario",
      "Requiere delay towers y potencia real",
    ],
    color: "#FFB84D",
    icon: "festival",
    room: {
      name: "Predio Festival",
      length: 60,
      width: 40,
      height: 10,
      capacity: 1500,
      ceilingType: "industrial",
      wallMaterial: "concrete",
      floorType: "concrete",
      windowCount: 0,
    },
    tops: [
      g({ id: "jbl-srx906", brand: "JBL", model: "SRX906LA", category: "tops", active: true, rmsWatts: 2000, peakWatts: 4000, splMax: 140, coverageH: 90, coverageV: 15, freqLow: 55, freqHigh: 20000, weight: 35, dspIntegrated: true, quantity: 12 }),
    ],
    subs: [
      g({ id: "qsc-kla181", brand: "QSC", model: "KLA181", category: "subs", active: true, rmsWatts: 1000, peakWatts: 2000, splMax: 138, coverageH: 360, coverageV: 360, freqLow: 37, freqHigh: 100, weight: 37, dspIntegrated: true, quantity: 8 }),
    ],
    monitors: [
      g({ id: "rcf-nx-45", brand: "RCF", model: "NX 45-A", category: "monitors", active: true, rmsWatts: 1000, splMax: 133, coverageH: 90, coverageV: 60, freqLow: 55, freqHigh: 20000, weight: 20, dspIntegrated: true, quantity: 6 }),
    ],
    dspUnits: [
      g({ id: "lake-lm44", brand: "Lake", model: "LM 44", category: "dsp", active: true, splMax: 0, dspIntegrated: true }),
    ],
    amps: [
      g({ id: "lab-plm20000q", brand: "Lab.gruppen", model: "PLM 20000Q", category: "amp", active: true, rmsWatts: 20000, splMax: 0, dspIntegrated: false, quantity: 4 }),
    ],
    mixers: [
      g({ id: "digico-sd12", brand: "DiGiCo", model: "SD12", category: "mixer", active: true, splMax: 0, dspIntegrated: false }),
    ],
    mics: [
      g({ id: "shure-sm58", brand: "Shure", model: "SM58", category: "mic", active: true, splMax: 155, dspIntegrated: false, quantity: 8 }),
      g({ id: "shure-beta52", brand: "Shure", model: "BETA 52A", category: "mic", active: true, splMax: 174, dspIntegrated: false, quantity: 2 }),
    ],
  },

  {
    id: "theater-500",
    name: "Teatro · 500 pax",
    category: "theater",
    serviceType: "Obra teatral / musical",
    description: "Cobertura uniforme con delay ring de refuerzo, subs discretos y monitors de piso para elenco.",
    ideal: [
      "Teatro con butacas fijas y balcón",
      "Obra teatral o musical",
      "Diálogo + refuerzo musical",
      "Prioridad: naturalidad y cobertura uniforme",
    ],
    color: "#00FF9E",
    icon: "theater",
    room: {
      name: "Teatro",
      length: 24,
      width: 18,
      height: 9,
      capacity: 500,
      ceilingType: "vaulted",
      wallMaterial: "wood",
      floorType: "wood",
      windowCount: 0,
    },
    tops: [
      g({ id: "jbl-vrx932la", brand: "JBL", model: "VRX932LA-1", category: "tops", active: true, rmsWatts: 800, peakWatts: 1600, splMax: 132, coverageH: 100, coverageV: 15, freqLow: 65, freqHigh: 20000, weight: 22, dspIntegrated: false, quantity: 4 }),
    ],
    subs: [
      g({ id: "qsc-ks118", brand: "QSC", model: "KS118", category: "subs", active: true, rmsWatts: 1600, peakWatts: 3200, splMax: 136, coverageH: 360, coverageV: 360, freqLow: 33, freqHigh: 88, weight: 42, dspIntegrated: true, quantity: 2 }),
    ],
    monitors: [
      g({ id: "qsc-k10", brand: "QSC", model: "K10.2", category: "monitors", active: true, rmsWatts: 2000, splMax: 131, coverageH: 75, coverageV: 75, freqLow: 53, freqHigh: 20000, weight: 16, dspIntegrated: true, quantity: 6 }),
    ],
    dspUnits: [
      g({ id: "biamp-tesira", brand: "Biamp", model: "Tesira Forte", category: "dsp", active: true, splMax: 0, dspIntegrated: true }),
    ],
    amps: [
      g({ id: "crown-xti4002", brand: "Crown", model: "XTi 4002", category: "amp", active: true, rmsWatts: 2000, splMax: 0, dspIntegrated: false, quantity: 2 }),
    ],
    mixers: [
      g({ id: "yamaha-tf5", brand: "Yamaha", model: "TF5", category: "mixer", active: true, splMax: 0, dspIntegrated: false }),
    ],
    mics: [
      g({ id: "dpa-4066", brand: "DPA", model: "4066", category: "mic", active: true, splMax: 144, dspIntegrated: false, quantity: 10 }),
      g({ id: "shure-sm58", brand: "Shure", model: "SM58", category: "mic", active: true, splMax: 155, dspIntegrated: false, quantity: 4 }),
    ],
  },
];

export function findTemplate(id: string): Template | undefined {
  return TEMPLATES.find(t => t.id === id);
}
