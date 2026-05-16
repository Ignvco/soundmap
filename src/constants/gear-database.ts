export interface GearItem {
  id:     string
  brand:  string
  name:   string
  specs:  string
  active: boolean  // activo = tiene amplificador interno
  emoji:  string
  cat:    'tops' | 'subs' | 'monitores' | 'amps' | 'dsp' | 'mixer' | 'mics'
}

export const GEAR_DB: GearItem[] = [
  // ─── TOPs ───────────────────────────────────────────
  { id: 'rcf912',   brand: 'RCF',          name: 'ART 912-A',      specs: 'Activo · 700W · 131dB · 12"',        active: true,  emoji: '🔴', cat: 'tops' },
  { id: 'rcf910',   brand: 'RCF',          name: 'ART 910-A',      specs: 'Activo · 400W · 128dB · 10"',        active: true,  emoji: '🔴', cat: 'tops' },
  { id: 'rcf935',   brand: 'RCF',          name: 'ART 935-A',      specs: 'Activo · 1050W · 134dB · 15"',       active: true,  emoji: '🔴', cat: 'tops' },
  { id: 'rcf745',   brand: 'RCF',          name: 'NX 745-A',       specs: 'Activo · 1100W · 134dB · 15"',       active: true,  emoji: '🔴', cat: 'tops' },
  { id: 'rcf932',   brand: 'RCF',          name: 'ART 932-A DSP',  specs: 'Activo · 2100W · 138dB · 12"',       active: true,  emoji: '🔴', cat: 'tops' },
  { id: 'qsck12',   brand: 'QSC',          name: 'K12.2',          specs: 'Activo · 2000W · 131dB · 12"',       active: true,  emoji: '🔵', cat: 'tops' },
  { id: 'qsck10',   brand: 'QSC',          name: 'K10.2',          specs: 'Activo · 2000W · 128dB · 10"',       active: true,  emoji: '🔵', cat: 'tops' },
  { id: 'qsckla12', brand: 'QSC',          name: 'KLA12',          specs: 'Activo · 1000W · 131dB · Line Array', active: true,  emoji: '🔵', cat: 'tops' },
  { id: 'jbl715',   brand: 'JBL',          name: 'EON715',         specs: 'Activo · 1300W · 129dB · 15"',       active: true,  emoji: '🟡', cat: 'tops' },
  { id: 'jblsrx',   brand: 'JBL',          name: 'SRX812P',        specs: 'Activo · 2000W · 136dB · 12"',       active: true,  emoji: '🟡', cat: 'tops' },
  { id: 'yamdxr12', brand: 'Yamaha',       name: 'DXR12 mkII',     specs: 'Activo · 1100W · 131dB · 12"',       active: true,  emoji: '⚫', cat: 'tops' },
  { id: 'yamdbr12', brand: 'Yamaha',       name: 'DBR12',          specs: 'Activo · 1000W · 131dB · 12"',       active: true,  emoji: '⚫', cat: 'tops' },
  { id: 'thump15',  brand: 'Mackie',       name: 'Thump15A',       specs: 'Activo · 1300W · 130dB · 15"',       active: true,  emoji: '🟤', cat: 'tops' },
  { id: 'evekx15',  brand: 'Electro-Voice',name: 'EKX-15P',        specs: 'Activo · 2000W · 135dB · 15"',       active: true,  emoji: '🟠', cat: 'tops' },
  { id: 'evzlx15',  brand: 'Electro-Voice',name: 'ZLX-15P',        specs: 'Activo · 1000W · 126dB · 15"',       active: true,  emoji: '🟠', cat: 'tops' },
  { id: 'pv215',    brand: 'Peavey',       name: 'PV215',          specs: 'Pasivo · 350W · 124dB · 2×15"',      active: false, emoji: '⬜', cat: 'tops' },
  { id: 'dbv8',     brand: 'd&b',          name: 'V8',             specs: 'Pasivo · 750W · 144dB · Line Array',  active: false, emoji: '⬛', cat: 'tops' },
  { id: 'lakiva',   brand: 'L-Acoustics',  name: 'KIVA II',        specs: 'Pasivo · 600W · 141dB · Line Array',  active: false, emoji: '⬛', cat: 'tops' },

  // ─── SUBs ────────────────────────────────────────────
  { id: 'air18',    brand: 'PreSonus',     name: 'AIR18',          specs: 'Activo · 1000W · 133dB · 18"',       active: true,  emoji: '🟠', cat: 'subs' },
  { id: 'rcf905',   brand: 'RCF',          name: 'ART 905-AS',     specs: 'Activo · 700W · 133dB · 15"',        active: true,  emoji: '🔴', cat: 'subs' },
  { id: 'rcf708',   brand: 'RCF',          name: 'SUB 8006-AS',    specs: 'Activo · 2200W · 140dB · 2×18"',     active: true,  emoji: '🔴', cat: 'subs' },
  { id: 'qscks118', brand: 'QSC',          name: 'KS118',          specs: 'Activo · 3600W · 138dB · 18"',       active: true,  emoji: '🔵', cat: 'subs' },
  { id: 'qscks212', brand: 'QSC',          name: 'KS212C',         specs: 'Activo · 3600W · 137dB · 2×12"',     active: true,  emoji: '🔵', cat: 'subs' },
  { id: 'jbl718',   brand: 'JBL',          name: 'EON718S',        specs: 'Activo · 1300W · 135dB · 18"',       active: true,  emoji: '🟡', cat: 'subs' },
  { id: 'evekxsub', brand: 'Electro-Voice',name: 'EKX-18SP',       specs: 'Activo · 2000W · 137dB · 18"',       active: true,  emoji: '🟠', cat: 'subs' },
  { id: 'yamdxs18', brand: 'Yamaha',       name: 'DXS18 mkII',     specs: 'Activo · 1020W · 134dB · 18"',       active: true,  emoji: '⚫', cat: 'subs' },
  { id: 'th118',    brand: 'Mackie',       name: 'Thump118S',      specs: 'Activo · 1200W · 132dB · 18"',       active: true,  emoji: '🟤', cat: 'subs' },

  // ─── Monitores ───────────────────────────────────────
  { id: 'monrcf',   brand: 'RCF',          name: 'Monitor NX 45-A',specs: 'Activo · 400W · 125dB · Cuña',       active: true,  emoji: '🔴', cat: 'monitores' },
  { id: 'mondxr8',  brand: 'Yamaha',       name: 'DXR8 (monitor)', specs: 'Activo · 1100W · 126dB · 8"',        active: true,  emoji: '⚫', cat: 'monitores' },
  { id: 'monk8',    brand: 'QSC',          name: 'K8.2 (monitor)', specs: 'Activo · 2000W · 126dB · 8"',        active: true,  emoji: '🔵', cat: 'monitores' },
  { id: 'monsrm',   brand: 'Mackie',       name: 'SRM150',         specs: 'Activo · 150W · 120dB · 5.25"',      active: true,  emoji: '🟤', cat: 'monitores' },

  // ─── Amplificadores ──────────────────────────────────
  { id: 'gemp800',  brand: 'Gemini',       name: 'P-800',          specs: '250W×2 @ 8Ω · STEREO siempre',      active: false, emoji: '⚡', cat: 'amps' },
  { id: 'crown1002',brand: 'Crown',        name: 'XLS 1002',       specs: '350W×2 @ 8Ω',                       active: false, emoji: '⚡', cat: 'amps' },
  { id: 'crown2002',brand: 'Crown',        name: 'XLS 2002',       specs: '650W×2 @ 8Ω',                       active: false, emoji: '⚡', cat: 'amps' },
  { id: 'qscgx5',   brand: 'QSC',          name: 'GX5',            specs: '500W×2 @ 8Ω',                       active: false, emoji: '⚡', cat: 'amps' },
  { id: 'labgruf',  brand: 'Lab.Gruppen',  name: 'FP 6400',        specs: '1600W×4 @ 8Ω · Touring',            active: false, emoji: '⚡', cat: 'amps' },

  // ─── DSP / Procesadores ──────────────────────────────
  { id: 'dcx2496',  brand: 'Behringer',    name: 'DCX2496',        specs: '6 salidas · 24bit/96kHz · LR24',     active: false, emoji: '⚙️', cat: 'dsp' },
  { id: 'driverack',brand: 'dbx',          name: 'DriveRack PA2',  specs: '2×6 · Auto-EQ · RTA · LCD',         active: false, emoji: '⚙️', cat: 'dsp' },
  { id: 'dr260',    brand: 'dbx',          name: 'DriveRack 260',  specs: '2×6 · Crossover · EQ · Delay',      active: false, emoji: '⚙️', cat: 'dsp' },
  { id: 'yamsp2060',brand: 'Yamaha',       name: 'SP2060',         specs: 'Speaker Processor · 2×6',           active: false, emoji: '⚙️', cat: 'dsp' },
  { id: 'dbx231',   brand: 'dbx',          name: '231s',           specs: 'Gráfico 31 bandas · Analógico',      active: false, emoji: '🎛️', cat: 'dsp' },
  { id: 'klark31',  brand: 'Klark Teknik', name: 'DN360',          specs: 'Gráfico 31 bandas · Dual',           active: false, emoji: '🎛️', cat: 'dsp' },

  // ─── Mixers ──────────────────────────────────────────
  { id: 'sl2442',   brand: 'Behringer',    name: 'SL2442FX',       specs: '24 canales · 4 Aux · Analógico',     active: false, emoji: '🎚️', cat: 'mixer' },
  { id: 'sl3242',   brand: 'Behringer',    name: 'SL3242FX',       specs: '32 canales · 4 Aux · Analógico',     active: false, emoji: '🎚️', cat: 'mixer' },
  { id: 'x32',      brand: 'Behringer',    name: 'X32',            specs: '32 canales · Digital · 25 FX',       active: false, emoji: '🎚️', cat: 'mixer' },
  { id: 'x32p',     brand: 'Behringer',    name: 'X32 Producer',   specs: '32 canales · Digital compacto',      active: false, emoji: '🎚️', cat: 'mixer' },
  { id: 'yammg20',  brand: 'Yamaha',       name: 'MG20XU',         specs: '20 canales · USB · FX · D-PRE',      active: false, emoji: '🎚️', cat: 'mixer' },
  { id: 'ah24',     brand: 'Allen & Heath',name: 'ZED-24',         specs: '24 canales · USB · FX',              active: false, emoji: '🎚️', cat: 'mixer' },
  { id: 'ahqu16',   brand: 'Allen & Heath',name: 'Qu-16',          specs: '16 canales · Digital · Wi-Fi',       active: false, emoji: '🎚️', cat: 'mixer' },
  { id: 'm32',      brand: 'Midas',        name: 'M32',            specs: '32 canales · Digital · 40 FX',       active: false, emoji: '🎚️', cat: 'mixer' },

  // ─── Micrófonos ──────────────────────────────────────
  { id: 'sm58',     brand: 'Shure',        name: 'SM58',           specs: 'Dinámico · Cardioide · Voz',         active: false, emoji: '🎤', cat: 'mics' },
  { id: 'sm48',     brand: 'Shure',        name: 'SM48',           specs: 'Dinámico · Cardioide · Predicación', active: false, emoji: '🎤', cat: 'mics' },
  { id: 'beta58',   brand: 'Shure',        name: 'Beta 58A',       specs: 'Dinámico · Supercardioide · Voz',    active: false, emoji: '🎤', cat: 'mics' },
  { id: 'sm57',     brand: 'Shure',        name: 'SM57',           specs: 'Dinámico · Cardioide · Instrumento', active: false, emoji: '🎤', cat: 'mics' },
  { id: 'ksm9',     brand: 'Shure',        name: 'KSM9',           specs: 'Condensador · Cardioide · Premium',  active: false, emoji: '🎙️', cat: 'mics' },
  { id: 'e835',     brand: 'Sennheiser',   name: 'e 835',          specs: 'Dinámico · Cardioide · Voz',         active: false, emoji: '🎤', cat: 'mics' },
  { id: 'e945',     brand: 'Sennheiser',   name: 'e 945',          specs: 'Dinámico · Supercardioide · Voz',    active: false, emoji: '🎤', cat: 'mics' },
  { id: 'md421',    brand: 'Sennheiser',   name: 'MD 421-II',      specs: 'Dinámico · Cardioide · Instrumento', active: false, emoji: '🎤', cat: 'mics' },
  { id: 'at2020',   brand: 'Audio-Technica',name: 'AT2020',        specs: 'Condensador · Cardioide · 48V',      active: false, emoji: '🎙️', cat: 'mics' },
  { id: 'atm710',   brand: 'Audio-Technica',name: 'ATM710',        specs: 'Condensador · Cardioide · Voz',      active: false, emoji: '🎙️', cat: 'mics' },
  { id: 'c214',     brand: 'AKG',          name: 'C214',           specs: 'Condensador · Cardioide · Studio',   active: false, emoji: '🎙️', cat: 'mics' },
  { id: 'akgd5',    brand: 'AKG',          name: 'D5',             specs: 'Dinámico · Supercardioide · Voz',    active: false, emoji: '🎤', cat: 'mics' },
  { id: 'blx24',    brand: 'Shure',        name: 'BLX24/SM58',     specs: 'Inalámbrico · SM58 · 215MHz',        active: false, emoji: '📡', cat: 'mics' },
  { id: 'slxd24',   brand: 'Shure',        name: 'SLXD24/SM58',    specs: 'Inalámbrico · Digital · SLXD',       active: false, emoji: '📡', cat: 'mics' },
  { id: 'ewg4',     brand: 'Sennheiser',   name: 'EW 135-p G4',    specs: 'Inalámbrico · G4 · Cardioide',       active: false, emoji: '📡', cat: 'mics' },
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
