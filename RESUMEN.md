# SoundMap — Resumen de la auditoría completa

`tsc` limpio · **159 tests** · `eslint` 0 errores · build OK · **0 dependencias nuevas**
`package.json` y `package-lock.json` byte a byte idénticos al original.

---

## El patrón, con los ocho casos

Todo lo que encontré es la misma falla estructural: **la capa de presentación
inventaba sus propios números, y nada la contradecía**.

| Pantalla | Afirmaba | Era en realidad |
|---|---|---|
| Home / Perform | SPL con `20·log10` | 6 dB inflado vs el motor |
| Kiosk | "PANIC MUTE" | No mutea nada |
| Perform Hub | "Compliance 100%" | Headroom ≥ 3 dB |
| Medidor SPL | Veredicto EU 2003/10/EC | Micrófono sin calibrar |
| DSP | "24 dB/oct Butterworth" | Linkwitz-Riley 24 |
| PDF al cliente | Curva Butterworth | LR24 (−6 dB en fc, no −3) |
| Comparar escenas | Deltas con `20·log10` | Modelo distinto al resto de la app |
| Tab de Delay | Distancia a 343 m/s fijos | El delay de al lado usaba otra `c` |

### Duplicaciones que causaban todo esto

- **7 copias de la ganancia de array** — `20·log10`, `10·log10` y `log2·3`
  conviviendo. Unificadas en `lib/audio/array-gain.ts`.
- **7 copias de la velocidad del sonido** — `343` fijo en siete archivos.
  Unificadas en `speedOfSoundFromTemp`.

Ahora hay una definición de cada cosa, y **tests de consistencia motor↔vista**
que fallan si alguien vuelve a reimplementar la física en una pantalla.

---

## Lo que descubrí al final, y es lo más incómodo

Al cablear la temperatura en el DSP me di cuenta de que **el formulario de
escaneo nunca pedía temperatura ni humedad**. El motor de acústica las acepta,
la absorción del aire ISO 9613-1 las usa, la alineación temporal las usa desde
que la arreglé — pero `room.temperature` era siempre `undefined` y todo caía a
20 °C.

O sea: buena parte de mi trabajo de temperatura estuvo inerte varias vueltas.

Ya está agregado (paso de materiales), y se propagó a: absorción del aire,
alineación sub↔top, torres de delay, modos de sala y la calculadora cardioide.

Para vos no es cosmético: Canaán climatizada a 20 °C y un show al aire libre en
Mendoza en enero a 35 °C cambian la absorción de agudos y corren **todos** los
delays un 2.6 %. En una torre a 100 m son ~7 ms.

---

## Navegación

- **2 pantallas eran inalcanzables** (`/toolkit`, `/export`): cero enlaces en
  toda la app. Ahora están en las acciones rápidas.
- **3 generaciones de navegación superpuestas.** Eliminé `design-hub` (312
  líneas muertas) y la nav v4 de `nav.tsx` (−363 líneas).
- **El wizard mentía sobre el progreso**: `patch` y `save` estaban hardcodeados
  en `false`, así que la barra nunca llegaba al final.
- **Dos barras inferiores solapadas** en el wizard.
- **Podías saltar a un paso vacío sin explicación.** Ahora cada paso declara su
  requisito y te ofrece el botón que lo desbloquea.
- **Estados vacíos sin salida** en `channels` y `community-gear`: corregidos.

---

## Componentes

Eran **cuatro** sistemas paralelos (`ui.tsx`, `vitals/`, `premium.tsx`,
`empty-state.tsx`): 1334 líneas de trabajo solapado, `ProgressRing` duplicado,
cuatro tarjetas de métrica distintas, 322 estilos inline, 33 radios a mano.

Agregué la escala de tokens que faltaba (`--radius-*`, `--space-*`, `--elev-*`)
y `vitals/primitives.tsx` con lo necesario para reemplazar a `ui.tsx`.

**La migración está empezada, no terminada**: hice `community-gear`, `channels`
y `kiosk`. Faltan ~12 páginas. El plan por orden de riesgo está en
`COMPONENTES.md`.

---

## Performance y plataforma

- Bundle inicial: **940 kB → 240 kB gzip** (−75 %) con rutas lazy.
- Paleta unificada (había una v5 rosa legacy en `:root` que causaba flash).
- `viewport-fit=cover`, safe areas, `100dvh`, touch en el FAB.
- Iconos PWA: eran el mismo PNG de 1024×1024 duplicado (1 MB → 199 kB).
- **La keystore de Android no estaba conectada al build**: los releases salían
  sin firmar. Corregido.
- Service worker: el toast de actualización nunca se disparaba.

---

## Lo que NO puedo afirmar

**No abrí la app en un navegador. Ni una sola vez, en toda la auditoría.**

Todo esto es análisis estático, tests y build. Es sólido para detectar física
inconsistente, pantallas inalcanzables y afirmaciones falsas. **No dice nada
sobre cómo se ve.**

Sin verificar visualmente: la paleta unificada, los campos de Ambiente en el
escaneo, el kiosk apaisado, los estados vacíos nuevos, las primitivas de
`vitals/`, y el panel de resumen de sesión (que sólo aparece al terminar una
medición con micrófono activo).

**Cobertura de motores: ~65 %.** Sin tests: `live-engine`, `channels-engine`,
`early-reflections`, `offline-advisor`. Dado que el patrón `[0]` (asumir rig
homogéneo) apareció en cinco módulos distintos, ahí probablemente haya más.

**Decisión pendiente tuya**: la calibración del medidor existe pero un teléfono
no es un sonómetro Clase 1 ni 2. Si querés usar SoundMap para documentar
cumplimiento en una sala, eso necesita equipo homologado — la app ahora lo dice
en los archivos exportados, pero la decisión de producto es tuya.
