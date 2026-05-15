export interface ChannelData {
  num:     string
  nombre:  string
  src:     string
  phantom: boolean
  tipo:    'voz' | 'inst' | 'fx'
  pan:     string
  fader:   string
  eq: { low: string; lowMid: string; highMid: string; high: string }
  nota:    string
}

export const CHANNELS_DATA: ChannelData[] = [
  {
    num: 'CH 1', nombre: 'Predicador', src: 'SM48', phantom: false, tipo: 'voz',
    pan: 'Centro', fader: '0 dB',
    eq: { low: '−3 dB', lowMid: '300Hz: −3dB', highMid: '2kHz: +1dB', high: '0 dB' },
    nota: 'SM48 necesita boost en 2kHz para claridad en sala reverberante.',
  },
  {
    num: 'CH 2', nombre: 'Líder vocal', src: 'Beta 58A', phantom: false, tipo: 'voz',
    pan: 'Centro', fader: '0 dB',
    eq: { low: '−4 dB', lowMid: '300Hz: −2dB', highMid: '3kHz: 0dB', high: '+1 dB' },
    nota: 'Supercardioide. No apuntar hacia los TOPs. Más sensible que SM58.',
  },
  {
    num: 'CH 3–5', nombre: 'Coristas × 3', src: 'SM58', phantom: false, tipo: 'voz',
    pan: 'Izq / Centro / Der', fader: '−6 dB',
    eq: { low: '−3 dB', lowMid: '300Hz: −2dB', highMid: '2.5kHz: +1dB', high: '0 dB' },
    nota: 'Faders −6dB bajo el líder vocal. CH3 izq, CH4 der, CH5 centro.',
  },
  {
    num: 'CH 6', nombre: 'Corista AT', src: 'AT Condensador', phantom: true, tipo: 'voz',
    pan: 'Derecha', fader: '−8 dB',
    eq: { low: '−5 dB', lowMid: '250Hz: −3dB', highMid: '2kHz: 0dB', high: '−1 dB' },
    nota: 'PHANTOM 48V OBLIGATORIO. Gain bajo — más sensible que dinámicos.',
  },
  {
    num: 'CH 7–8', nombre: 'Guitarras × 2', src: 'DI Box', phantom: false, tipo: 'inst',
    pan: 'Leve Izq / Leve Der', fader: '−6 dB',
    eq: { low: '−4 dB', lowMid: '220Hz: −2dB', highMid: '2.5kHz: +2dB', high: '+1 dB' },
    nota: 'Sala reverberante: menos nivel del que parece necesario. CH7 izq, CH8 der.',
  },
  {
    num: 'CH 9', nombre: 'Bajo eléctrico', src: 'DI Box', phantom: false, tipo: 'inst',
    pan: 'Centro', fader: '−3 dB',
    eq: { low: '−2 dB', lowMid: '180Hz: −2dB', highMid: '900Hz: +2dB', high: '−2 dB' },
    nota: 'Balance crítico con bombo acústico de la batería. No pisar el bombo.',
  },
  {
    num: 'CH 10', nombre: 'Piano 1 (L)', src: 'DI Box', phantom: false, tipo: 'inst',
    pan: '9h (izq suave)', fader: '−8 dB',
    eq: { low: '−3 dB', lowMid: '250Hz: −2dB', highMid: '2kHz: 0dB', high: '0 dB' },
    nota: 'Señal de línea (+4dBu) — gain muy bajo. CH10+CH11 imagen estéreo del piano.',
  },
  {
    num: 'CH 11', nombre: 'Piano 2 (R)', src: 'DI Box', phantom: false, tipo: 'inst',
    pan: '3h (der suave)', fader: '−8 dB',
    eq: { low: '−3 dB', lowMid: '250Hz: −2dB', highMid: '2kHz: 0dB', high: '0 dB' },
    nota: 'CH10 izq + CH11 der crean imagen estéreo del piano en la mezcla.',
  },
  {
    num: 'CH 12', nombre: 'Secuencia', src: 'PC/Interfaz', phantom: false, tipo: 'inst',
    pan: 'Centro', fader: '−10 dB',
    eq: { low: '−3 dB', lowMid: '200Hz: −2dB', highMid: '0dB', high: '0 dB' },
    nota: 'También por Aux a in-ears. PC nunca en ahorro de energía.',
  },
  {
    num: 'CH 13', nombre: 'Click', src: 'PC/Interfaz', phantom: false, tipo: 'fx',
    pan: '—', fader: '−∞ SIEMPRE',
    eq: { low: '—', lowMid: '—', highMid: '—', high: '—' },
    nota: 'FADER PA EN −∞ SIEMPRE. Solo por Aux a in-ears. Congregación nunca lo escucha.',
  },
]