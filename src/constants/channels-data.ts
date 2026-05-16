export interface ChannelData {
  id:      number
  num:     string
  nombre:  string
  src:     string
  phantom: boolean
  tipo:    'voz' | 'inst' | 'fx' | 'perc'
  pan:     string
  fader:   string
  eq: {
    low:     string
    lowMid:  string
    highMid: string
    high:    string
  }
  nota: string
}

export const CHANNELS_DATA: ChannelData[] = [
  {
    id: 1, num: 'CH 1', nombre: 'Predicador', src: 'SM48',
    phantom: false, tipo: 'voz', pan: 'Centro', fader: '0 dB',
    eq: { low: '−3 dB', lowMid: '300Hz: −3dB', highMid: '2kHz: +1dB', high: '0 dB' },
    nota: 'Necesita boost en 2kHz. Hablar a 5–10cm del mic.',
  },
  {
    id: 2, num: 'CH 2', nombre: 'Líder vocal', src: 'Beta 58A',
    phantom: false, tipo: 'voz', pan: 'Centro', fader: '0 dB',
    eq: { low: '−4 dB', lowMid: '300Hz: −2dB', highMid: '3kHz: 0dB', high: '+1 dB' },
    nota: 'Supercardioide — no apuntar a TOPs. Más sensible que SM58.',
  },
  {
    id: 3, num: 'CH 3–5', nombre: 'Coristas × 3', src: 'SM58',
    phantom: false, tipo: 'voz', pan: 'L/C/R', fader: '−6 dB',
    eq: { low: '−3 dB', lowMid: '300Hz: −2dB', highMid: '2.5kHz: +1dB', high: '0 dB' },
    nota: 'Faders −6dB bajo el líder. CH3 izq, CH4 centro, CH5 der.',
  },
  {
    id: 4, num: 'CH 6', nombre: 'Corista AT', src: 'AT Condensador',
    phantom: true, tipo: 'voz', pan: 'Der', fader: '−8 dB',
    eq: { low: '−5 dB', lowMid: '250Hz: −3dB', highMid: '2kHz: 0dB', high: '−1 dB' },
    nota: 'PHANTOM 48V OBLIGATORIO. Gain bajo — más sensible que dinámicos.',
  },
  {
    id: 5, num: 'CH 7–8', nombre: 'Guitarras × 2', src: 'DI Box',
    phantom: false, tipo: 'inst', pan: 'L/R suave', fader: '−6 dB',
    eq: { low: '−4 dB', lowMid: '220Hz: −2dB', highMid: '2.5kHz: +2dB', high: '+1 dB' },
    nota: 'Menos nivel del que parece. Sala reverberante amplifica todo.',
  },
  {
    id: 6, num: 'CH 9', nombre: 'Bajo eléctrico', src: 'DI Box',
    phantom: false, tipo: 'inst', pan: 'Centro', fader: '−3 dB',
    eq: { low: '−2 dB', lowMid: '180Hz: −2dB', highMid: '900Hz: +2dB', high: '−2 dB' },
    nota: 'Balance crítico con bombo acústico. No pisar la batería.',
  },
  {
    id: 7, num: 'CH 10', nombre: 'Piano 1 (L)', src: 'DI Box',
    phantom: false, tipo: 'inst', pan: '9h (izq)', fader: '−8 dB',
    eq: { low: '−3 dB', lowMid: '250Hz: −2dB', highMid: '2kHz: 0dB', high: '0 dB' },
    nota: 'Señal de línea (+4dBu) — gain muy bajo. Imagen estéreo con CH11.',
  },
  {
    id: 8, num: 'CH 11', nombre: 'Piano 2 (R)', src: 'DI Box',
    phantom: false, tipo: 'inst', pan: '3h (der)', fader: '−8 dB',
    eq: { low: '−3 dB', lowMid: '250Hz: −2dB', highMid: '2kHz: 0dB', high: '0 dB' },
    nota: 'CH10+CH11 crean imagen estéreo del piano.',
  },
  {
    id: 9, num: 'CH 12', nombre: 'Secuencia', src: 'PC/Interfaz',
    phantom: false, tipo: 'inst', pan: 'Centro', fader: '−10 dB',
    eq: { low: '−3 dB', lowMid: '200Hz: −2dB', highMid: '0dB', high: '0 dB' },
    nota: 'También por Aux a in-ears. PC nunca en ahorro de energía.',
  },
  {
    id: 10, num: 'CH 13', nombre: 'Click', src: 'PC/Interfaz',
    phantom: false, tipo: 'fx', pan: '—', fader: '−∞ SIEMPRE',
    eq: { low: '—', lowMid: '—', highMid: '—', high: '—' },
    nota: 'FADER PA EN −∞ SIEMPRE. Solo por Aux a in-ears de músicos.',
  },
]
