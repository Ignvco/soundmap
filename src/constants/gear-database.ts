export type GearCat = 'tops' | 'subs' | 'monitores' | 'amps' | 'dsp' | 'mixer' | 'mics'
export type SystemType = 'active' | 'passive' | 'hybrid'

export interface GearItem {
  id:         string
  brand:      string
  name:       string
  specs:      string
  active:     boolean    // tiene amplificador interno
  emoji:      string
  cat:        GearCat
  spl?:       number     // dB SPL max
  watts?:     number     // potencia del amplificador interno
  ohms?:      number     // impedancia nominal
  inputs?:    number     // entradas (para mixers)
  outputs?:   number     // salidas (para DSP)
}

export const GEAR_DB: GearItem[] = [
  // ─── TOPs Activos ──────────────────────────────────────
  { id: 'rcf912',   brand: 'RCF',          name: 'ART 912-A',       specs: 'Activo · 700W · 131dB · 12"',         active: true,  emoji: '🔴', cat: 'tops', spl: 131, watts: 700,  ohms: 8 },
  { id: 'rcf910',   brand: 'RCF',          name: 'ART 910-A',       specs: 'Activo · 400W · 128dB · 10"',         active: true,  emoji: '🔴', cat: 'tops', spl: 128, watts: 400,  ohms: 8 },
  { id: 'rcf935',   brand: 'RCF',          name: 'ART 935-A',       specs: 'Activo · 1050W · 134dB · 15"',        active: true,  emoji: '🔴', cat: 'tops', spl: 134, watts: 1050, ohms: 8 },
  { id: 'rcf745',   brand: 'RCF',          name: 'NX 745-A',        specs: 'Activo · 1100W · 134dB · 15"',        active: true,  emoji: '🔴', cat: 'tops', spl: 134, watts: 1100, ohms: 8 },
  { id: 'rcf932',   brand: 'RCF',          name: 'ART 932-A DSP',   specs: 'Activo · 2100W · 138dB · 12" DSP',   active: true,  emoji: '🔴', cat: 'tops', spl: 138, watts: 2100, ohms: 8 },
  { id: 'qsck12',   brand: 'QSC',          name: 'K12.2',           specs: 'Activo · 2000W · 131dB · 12"',        active: true,  emoji: '🔵', cat: 'tops', spl: 131, watts: 2000, ohms: 8 },
  { id: 'qsck10',   brand: 'QSC',          name: 'K10.2',           specs: 'Activo · 2000W · 128dB · 10"',        active: true,  emoji: '🔵', cat: 'tops', spl: 128, watts: 2000, ohms: 8 },
  { id: 'qsckla12', brand: 'QSC',          name: 'KLA12',           specs: 'Activo · 1000W · 131dB · Line Array', active: true,  emoji: '🔵', cat: 'tops', spl: 131, watts: 1000, ohms: 8 },
  { id: 'jbl715',   brand: 'JBL',          name: 'EON715',          specs: 'Activo · 1300W · 129dB · 15"',        active: true,  emoji: '🟡', cat: 'tops', spl: 129, watts: 1300, ohms: 8 },
  { id: 'jblsrx',   brand: 'JBL',          name: 'SRX812P',         specs: 'Activo · 2000W · 136dB · 12"',        active: true,  emoji: '🟡', cat: 'tops', spl: 136, watts: 2000, ohms: 8 },
  { id: 'yamdxr12', brand: 'Yamaha',       name: 'DXR12 mkII',      specs: 'Activo · 1100W · 131dB · 12"',        active: true,  emoji: '⚫', cat: 'tops', spl: 131, watts: 1100, ohms: 8 },
  { id: 'yamdbr12', brand: 'Yamaha',       name: 'DBR12',           specs: 'Activo · 1000W · 131dB · 12"',        active: true,  emoji: '⚫', cat: 'tops', spl: 131, watts: 1000, ohms: 8 },
  { id: 'thump15',  brand: 'Mackie',       name: 'Thump15A',        specs: 'Activo · 1300W · 130dB · 15"',        active: true,  emoji: '🟤', cat: 'tops', spl: 130, watts: 1300, ohms: 8 },
  { id: 'evekx15',  brand: 'Electro-Voice',name: 'EKX-15P',         specs: 'Activo · 2000W · 135dB · 15"',        active: true,  emoji: '🟠', cat: 'tops', spl: 135, watts: 2000, ohms: 8 },
  { id: 'evzlx15',  brand: 'Electro-Voice',name: 'ZLX-15P',         specs: 'Activo · 1000W · 126dB · 15"',        active: true,  emoji: '🟠', cat: 'tops', spl: 126, watts: 1000, ohms: 8 },
  // ─── TOPs Pasivos ──────────────────────────────────────
  { id: 'pv215',    brand: 'Peavey',       name: 'PV215',           specs: 'Pasivo · 350W · 124dB · 2×15"',       active: false, emoji: '⬜', cat: 'tops', spl: 124, watts: 350,  ohms: 4 },
  { id: 'pv115',    brand: 'Peavey',       name: 'PV115',           specs: 'Pasivo · 200W · 120dB · 15"',         active: false, emoji: '⬜', cat: 'tops', spl: 120, watts: 200,  ohms: 8 },
  { id: 'dbv8',     brand: 'd&b',          name: 'V8',              specs: 'Pasivo · 750W · 144dB · Line Array',  active: false, emoji: '⬛', cat: 'tops', spl: 144, watts: 750,  ohms: 8 },
  { id: 'lakiva',   brand: 'L-Acoustics',  name: 'KIVA II',         specs: 'Pasivo · 600W · 141dB · Line Array',  active: false, emoji: '⬛', cat: 'tops', spl: 141, watts: 600,  ohms: 8 },
  { id: 'yamcbr12', brand: 'Yamaha',       name: 'CBR12',           specs: 'Pasivo · 350W · 126dB · 12"',         active: false, emoji: '⚫', cat: 'tops', spl: 126, watts: 350,  ohms: 8 },

  // ─── SUBs Activos ──────────────────────────────────────
  { id: 'air18',    brand: 'PreSonus',     name: 'AIR18',           specs: 'Activo · 1000W · 133dB · 18"',        active: true,  emoji: '🟠', cat: 'subs', spl: 133, watts: 1000, ohms: 8 },
  { id: 'rcf905',   brand: 'RCF',          name: 'ART 905-AS',      specs: 'Activo · 700W · 133dB · 15"',         active: true,  emoji: '🔴', cat: 'subs', spl: 133, watts: 700,  ohms: 8 },
  { id: 'rcf708',   brand: 'RCF',          name: 'SUB 8006-AS',     specs: 'Activo · 2200W · 140dB · 2×18"',      active: true,  emoji: '🔴', cat: 'subs', spl: 140, watts: 2200, ohms: 8 },
  { id: 'qscks118', brand: 'QSC',          name: 'KS118',           specs: 'Activo · 3600W · 138dB · 18"',        active: true,  emoji: '🔵', cat: 'subs', spl: 138, watts: 3600, ohms: 8 },
  { id: 'qscks212', brand: 'QSC',          name: 'KS212C',          specs: 'Activo · 3600W · 137dB · 2×12"',      active: true,  emoji: '🔵', cat: 'subs', spl: 137, watts: 3600, ohms: 8 },
  { id: 'jbl718',   brand: 'JBL',          name: 'EON718S',         specs: 'Activo · 1300W · 135dB · 18"',        active: true,  emoji: '🟡', cat: 'subs', spl: 135, watts: 1300, ohms: 8 },
  { id: 'evekxsub', brand: 'Electro-Voice',name: 'EKX-18SP',        specs: 'Activo · 2000W · 137dB · 18"',        active: true,  emoji: '🟠', cat: 'subs', spl: 137, watts: 2000, ohms: 8 },
  { id: 'yamdxs18', brand: 'Yamaha',       name: 'DXS18 mkII',      specs: 'Activo · 1020W · 134dB · 18"',        active: true,  emoji: '⚫', cat: 'subs', spl: 134, watts: 1020, ohms: 8 },
  { id: 'th118',    brand: 'Mackie',       name: 'Thump118S',       specs: 'Activo · 1200W · 132dB · 18"',        active: true,  emoji: '🟤', cat: 'subs', spl: 132, watts: 1200, ohms: 8 },
  // ─── SUBs Pasivos ──────────────────────────────────────
  { id: 'pvsub218', brand: 'Peavey',       name: '218-SUB',         specs: 'Pasivo · 600W · 126dB · 2×18"',       active: false, emoji: '⬜', cat: 'subs', spl: 126, watts: 600,  ohms: 4 },

  // ─── Monitores ─────────────────────────────────────────
  { id: 'monrcf',   brand: 'RCF',          name: 'NX 45-A Monitor', specs: 'Activo · 400W · 125dB · Cuña 15"',    active: true,  emoji: '🔴', cat: 'monitores', spl: 125, watts: 400 },
  { id: 'mondxr8',  brand: 'Yamaha',       name: 'DXR8 Monitor',    specs: 'Activo · 1100W · 126dB · 8"',         active: true,  emoji: '⚫', cat: 'monitores', spl: 126, watts: 1100 },
  { id: 'monk8',    brand: 'QSC',          name: 'K8.2 Monitor',    specs: 'Activo · 2000W · 126dB · 8"',         active: true,  emoji: '🔵', cat: 'monitores', spl: 126, watts: 2000 },
  { id: 'monsrm',   brand: 'Mackie',       name: 'SRM150',          specs: 'Activo · 150W · 120dB · 5.25"',       active: true,  emoji: '🟤', cat: 'monitores', spl: 120, watts: 150 },
  { id: 'monjbl3',  brand: 'JBL',          name: '305P MkII',       specs: 'Activo · 82W · Studio · 5"',          active: true,  emoji: '🟡', cat: 'monitores', spl: 108, watts: 82 },
  { id: 'monpasivo',brand: 'Genérico',     name: 'Monitor pasivo',  specs: 'Pasivo · 200W · 8Ω · Cuña',           active: false, emoji: '⬜', cat: 'monitores', spl: 118, watts: 200, ohms: 8 },

  // ─── Amplificadores ────────────────────────────────────
  { id: 'gemp800',  brand: 'Gemini',       name: 'P-800',           specs: '250W×2 @ 8Ω · Stereo',                active: false, emoji: '⚡', cat: 'amps', watts: 500,  ohms: 8, outputs: 2 },
  { id: 'crown1002',brand: 'Crown',        name: 'XLS 1002',        specs: '350W×2 @ 8Ω · 2 canales',             active: false, emoji: '⚡', cat: 'amps', watts: 700,  ohms: 8, outputs: 2 },
  { id: 'crown2002',brand: 'Crown',        name: 'XLS 2002',        specs: '650W×2 @ 8Ω · 2 canales',             active: false, emoji: '⚡', cat: 'amps', watts: 1300, ohms: 8, outputs: 2 },
  { id: 'crown3002',brand: 'Crown',        name: 'XLS 3002',        specs: '900W×2 @ 8Ω · 2 canales',             active: false, emoji: '⚡', cat: 'amps', watts: 1800, ohms: 8, outputs: 2 },
  { id: 'qscgx5',   brand: 'QSC',          name: 'GX5',             specs: '500W×2 @ 8Ω · 2 canales',             active: false, emoji: '⚡', cat: 'amps', watts: 1000, ohms: 8, outputs: 2 },
  { id: 'qscgx7',   brand: 'QSC',          name: 'GX7',             specs: '750W×2 @ 8Ω · 2 canales',             active: false, emoji: '⚡', cat: 'amps', watts: 1500, ohms: 8, outputs: 2 },
  { id: 'labgrup',  brand: 'Lab.Gruppen',  name: 'FP 6400',         specs: '1600W×4 @ 8Ω · 4 canales',            active: false, emoji: '⚡', cat: 'amps', watts: 6400, ohms: 8, outputs: 4 },
  { id: 'powersoft',brand: 'Powersoft',    name: 'K20 DSP+AES',     specs: '20000W · DSP integrado · 4 canales',  active: false, emoji: '⚡', cat: 'amps', watts: 20000,ohms: 4, outputs: 4 },

  // ─── DSP / Procesadores ────────────────────────────────
  { id: 'dcx2496',  brand: 'Behringer',    name: 'DCX2496',         specs: '6 sal. · 24bit/96kHz · LR24',         active: false, emoji: '⚙️', cat: 'dsp', inputs: 2, outputs: 6 },
  { id: 'driverack',brand: 'dbx',          name: 'DriveRack PA2',   specs: '2×6 · Auto-EQ · RTA · LCD',           active: false, emoji: '⚙️', cat: 'dsp', inputs: 2, outputs: 6 },
  { id: 'dr260',    brand: 'dbx',          name: 'DriveRack 260',   specs: '2×6 · Crossover · EQ · Delay',        active: false, emoji: '⚙️', cat: 'dsp', inputs: 2, outputs: 6 },
  { id: 'yamsp2060',brand: 'Yamaha',       name: 'SP2060',          specs: 'Speaker Proc. · 2×6 · EQ param.',     active: false, emoji: '⚙️', cat: 'dsp', inputs: 2, outputs: 6 },
  { id: 'lakeproc', brand: 'Lab.Gruppen',  name: 'Lake LM26',       specs: 'DSP avanzado · FIR · 2×6',            active: false, emoji: '⚙️', cat: 'dsp', inputs: 2, outputs: 6 },
  { id: 'dbx231',   brand: 'dbx',          name: '231s',            specs: 'EQ gráfico 31 bandas · Analógico',    active: false, emoji: '🎛️', cat: 'dsp', inputs: 2, outputs: 2 },
  { id: 'klark31',  brand: 'Klark Teknik', name: 'DN360',           specs: 'Gráfico 31 bandas · Dual',            active: false, emoji: '🎛️', cat: 'dsp', inputs: 2, outputs: 2 },

  // ─── Mixers ────────────────────────────────────────────
  { id: 'sl2442',   brand: 'Behringer',    name: 'SL2442FX',        specs: '24 canales · 4 Aux · Analógico',      active: false, emoji: '🎚️', cat: 'mixer', inputs: 24, outputs: 4 },
  { id: 'sl3242',   brand: 'Behringer',    name: 'SL3242FX',        specs: '32 canales · 4 Aux · Analógico',      active: false, emoji: '🎚️', cat: 'mixer', inputs: 32, outputs: 4 },
  { id: 'x32',      brand: 'Behringer',    name: 'X32',             specs: '32 canales · Digital · 25 FX',        active: false, emoji: '🎚️', cat: 'mixer', inputs: 32, outputs: 16 },
  { id: 'x32p',     brand: 'Behringer',    name: 'X32 Producer',    specs: '32 canales · Digital compacto',       active: false, emoji: '🎚️', cat: 'mixer', inputs: 32, outputs: 16 },
  { id: 'yammg20',  brand: 'Yamaha',       name: 'MG20XU',          specs: '20 canales · USB · D-PRE',            active: false, emoji: '🎚️', cat: 'mixer', inputs: 20, outputs: 6 },
  { id: 'ah24',     brand: 'Allen & Heath',name: 'ZED-24',          specs: '24 canales · USB · FX',               active: false, emoji: '🎚️', cat: 'mixer', inputs: 24, outputs: 6 },
  { id: 'ahqu16',   brand: 'Allen & Heath',name: 'Qu-16',           specs: '16 canales · Digital · Wi-Fi',        active: false, emoji: '🎚️', cat: 'mixer', inputs: 16, outputs: 12 },
  { id: 'm32',      brand: 'Midas',        name: 'M32',             specs: '32 canales · Digital · 40 FX',        active: false, emoji: '🎚️', cat: 'mixer', inputs: 32, outputs: 16 },

  // ─── Micrófonos ────────────────────────────────────────
  { id: 'sm58',     brand: 'Shure',        name: 'SM58',            specs: 'Dinámico · Cardioide · Voz',          active: false, emoji: '🎤', cat: 'mics' },
  { id: 'sm48',     brand: 'Shure',        name: 'SM48',            specs: 'Dinámico · Cardioide · Predicación',  active: false, emoji: '🎤', cat: 'mics' },
  { id: 'beta58',   brand: 'Shure',        name: 'Beta 58A',        specs: 'Dinámico · Supercardioide · Voz',     active: false, emoji: '🎤', cat: 'mics' },
  { id: 'sm57',     brand: 'Shure',        name: 'SM57',            specs: 'Dinámico · Cardioide · Instrumento',  active: false, emoji: '🎤', cat: 'mics' },
  { id: 'ksm9',     brand: 'Shure',        name: 'KSM9',            specs: 'Condensador · Dual · Premium',        active: false, emoji: '🎙️', cat: 'mics' },
  { id: 'e835',     brand: 'Sennheiser',   name: 'e 835',           specs: 'Dinámico · Cardioide · Voz',          active: false, emoji: '🎤', cat: 'mics' },
  { id: 'e945',     brand: 'Sennheiser',   name: 'e 945',           specs: 'Dinámico · Supercardioide · Voz',     active: false, emoji: '🎤', cat: 'mics' },
  { id: 'md421',    brand: 'Sennheiser',   name: 'MD 421-II',       specs: 'Dinámico · Cardioide · Instrumento',  active: false, emoji: '🎤', cat: 'mics' },
  { id: 'at2020',   brand: 'Audio-Technica',name: 'AT2020',         specs: 'Condensador · Cardioide · 48V',       active: false, emoji: '🎙️', cat: 'mics' },
  { id: 'c214',     brand: 'AKG',          name: 'C214',            specs: 'Condensador · Cardioide · Studio',    active: false, emoji: '🎙️', cat: 'mics' },
  { id: 'blx24',    brand: 'Shure',        name: 'BLX24/SM58',      specs: 'Inalámbrico · SM58 · 215MHz',         active: false, emoji: '📡', cat: 'mics' },
  { id: 'slxd24',   brand: 'Shure',        name: 'SLXD24/SM58',     specs: 'Inalámbrico · Digital · SLXD',        active: false, emoji: '📡', cat: 'mics' },
  { id: 'ewg4',     brand: 'Sennheiser',   name: 'EW 135-p G4',     specs: 'Inalámbrico · G4 · Cardioide',        active: false, emoji: '📡', cat: 'mics' },
]

export const GEAR_CATS = [
  { key: 'tops',      label: 'TOPs'       },
  { key: 'subs',      label: 'SUBs'       },
  { key: 'monitores', label: 'Monitores'  },
  { key: 'amps',      label: 'Amplif.'    },
  { key: 'dsp',       label: 'DSP'        },
  { key: 'mixer',     label: 'Mixers'     },
  { key: 'mics',      label: 'Micrófonos' },
] as const

// ─── Helpers ──────────────────────────────────────────────

/** Detecta el tipo de sistema según el gear seleccionado */
export function detectSystemType(
  tops: string[],
  subs: string[],
): 'active' | 'passive' | 'hybrid' {
  const topItems = tops.map((id) => GEAR_DB.find((g) => g.id === id))
  const subItems = subs.map((id) => GEAR_DB.find((g) => g.id === id))

  const hasActive  = [...topItems, ...subItems].some((g) => g?.active === true)
  const hasPassive = [...topItems, ...subItems].some((g) => g?.active === false)

  if (hasActive && hasPassive) return 'hybrid'
  if (hasPassive)              return 'passive'
  return 'active'
}

/** Valida compatibilidad amp → parlante pasivo */
export interface AmpCompatibility {
  ok:      boolean
  warning: string | null
}
export function checkAmpCompatibility(
  ampWatts: number,
  speakerWatts: number,
  speakerOhms:  number,
  ampOhms:      number,
): AmpCompatibility {
  if (ampOhms > speakerOhms) {
    return { ok: false, warning: `El amp es para ${ampOhms}Ω pero el parlante es ${speakerOhms}Ω — posible daño.` }
  }
  const ratio = ampWatts / speakerWatts
  if (ratio < 0.5)  return { ok: false,  warning: `Amp muy pequeño (${ampWatts}W) para parlante de ${speakerWatts}W — sin headroom.` }
  if (ratio > 3)    return { ok: false,  warning: `Amp muy grande (${ampWatts}W) para parlante de ${speakerWatts}W — riesgo de daño.` }
  if (ratio > 2)    return { ok: true,   warning: `Amp sobredimensionado. Usar ganancia máx. 70%.` }
  return { ok: true, warning: null }
}
