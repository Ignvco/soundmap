export interface ChannelData {
  num: string
  nombre: string
  src: string
  phantom: boolean
  pan: string
  tipo: 'voz' | 'inst' | 'fx'
  fader: string
  eq: {
    low: string
    lowMid: string
    highMid: string
    high: string
  }
  nota: string
}

export const CHANNELS_DATA: ChannelData[] = [
  {
    num: 'CH 1',
    nombre: 'Predicador',
    src: 'Shure SM48',
    phantom: false,
    pan: 'Centro',
    tipo: 'voz',
    fader: '0 dB',
    eq: { low: '−3 dB', lowMid: '300Hz: −3dB', highMid: '2kHz: +1dB', high: '0 dB' },
    nota: 'SM48 necesita más boost en 2kHz para claridad en voz hablada.',
  },

  {
    num: 'CH 2',
    nombre: 'Líder vocal',
    src: 'Shure Beta 58A',
    phantom: false,
    pan: 'Centro',
    tipo: 'voz',
    fader: '0 dB',
    eq: { low: '−4 dB', lowMid: '300Hz: −2dB', highMid: '3kHz: 0dB', high: '+1 dB' },
    nota: 'Supercardioide. Gain más bajo que el SM58. No apuntar hacia los TOPs.',
  },

  {
    num: 'CH 3–5',
    nombre: 'Coristas × 3',
    src: 'Shure SM58',
    phantom: false,
    pan: 'Izq / Der / Centro',
    tipo: 'voz',
    fader: '−6 dB',
    eq: { low: '−3 dB', lowMid: '300Hz: −2dB', highMid: '2.5kHz: +1dB', high: '0 dB' },
    nota: 'Faders −6dB bajo el líder. Ajustar individualmente por voz.',
  },

  {
    num: 'CH 6',
    nombre: 'Corista AT',
    src: 'AT Condensador',
    phantom: true,
    pan: 'Derecha',
    tipo: 'voz',
    fader: '−8 dB',
    eq: { low: '−5 dB', lowMid: '250Hz: −3dB', highMid: '2kHz: 0dB', high: '−1 dB' },
    nota: 'PHANTOM 48V OBLIGATORIO. Gain mucho más bajo que los dinámicos.',
  },

  {
    num: 'CH 7–8',
    nombre: 'Guitarras × 2',
    src: 'DI Box → XLR',
    phantom: false,
    pan: 'Leve izq / der',
    tipo: 'inst',
    fader: '−6 dB',
    eq: { low: '−4 dB', lowMid: '220Hz: −2dB', highMid: '2.5kHz: +2dB', high: '+1 dB' },
    nota: 'En sala reflectiva: menos nivel del que parece necesario.',
  },

  {
    num: 'CH 9',
    nombre: 'Bajo eléctrico',
    src: 'DI Box → XLR',
    phantom: false,
    pan: 'Centro',
    tipo: 'inst',
    fader: '−3 dB',
    eq: { low: '−2 dB', lowMid: '180Hz: −2dB', highMid: '900Hz: +2dB', high: '−2 dB' },
    nota: 'Balance crítico con bombo acústico. El bajo no debe tapar el bombo.',
  },

  {
    num: 'CH 10',
    nombre: 'Piano 1 (L)',
    src: 'DI Box → XLR',
    phantom: false,
    pan: '9h (izq suave)',
    tipo: 'inst',
    fader: '−8 dB',
    eq: { low: '−3 dB', lowMid: '250Hz: −2dB', highMid: '2kHz: 0dB', high: '0 dB' },
    nota: 'Señal de línea — gain muy bajo en el preamp.',
  },

  {
    num: 'CH 11',
    nombre: 'Piano 2 (R)',
    src: 'DI Box → XLR',
    phantom: false,
    pan: '3h (der suave)',
    tipo: 'inst',
    fader: '−8 dB',
    eq: { low: '−3 dB', lowMid: '250Hz: −2dB', highMid: '2kHz: 0dB', high: '0 dB' },
    nota: 'CH10 + CH11 crean imagen estéreo del piano.',
  },

  {
    num: 'CH 12',
    nombre: 'Secuencia',
    src: 'PC / Interfaz',
    phantom: false,
    pan: 'Centro',
    tipo: 'inst',
    fader: '−10 dB',
    eq: { low: '−3 dB', lowMid: '200Hz: −2dB', highMid: '0dB', high: '0 dB' },
    nota: 'También enviar por Aux a in-ears de los músicos.',
  },

  {
    num: 'CH 13',
    nombre: 'Click',
    src: 'PC / Interfaz',
    phantom: false,
    pan: '—',
    tipo: 'fx',
    fader: '−∞ SIEMPRE',
    eq: { low: '—', lowMid: '—', highMid: '—', high: '—' },
    nota: 'FADER PA EN −∞ SIEMPRE. Solo por Aux a in-ears. La congregación nunca escucha el click.',
  },
]
