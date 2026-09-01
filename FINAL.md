# Cierre — última pasada

`tsc` limpio · **181 tests** (antes 159) · `eslint` 0 errores · build OK
`package.json` y `package-lock.json` byte a byte idénticos a tu original.

---

## El sexto módulo con el patrón `[0]` — y era el peor

Escribir los tests de `channels-engine` destapó esto:

```js
if (idx === 11 && mics.length > 0) {
  const vocalMic = mics[0];
  patch.source = `${vocalMic.brand} ${vocalMic.model}`;
}
```

**El patch de canales ignoraba tu inventario de micrófonos.** Devolvía una
plantilla fija de 16 canales y lo único que hacía con tu selección era escribir
el nombre del **primer** micrófono en el canal 12. Las cantidades se descartaban
enteras.

Traducido: elegís seis micrófonos en el paso de PA, y cinco son invisibles en el
patch. Para un ingeniero eso vacía de sentido la pantalla — la lista de canales
*es* el inventario asignado a entradas.

**Arreglado.** La plantilla sigue aportando la estructura (patch de banda
estándar: bombo, redoblante, toms, OH, bajo, guitarras, teclados, voces) porque
como punto de partida es buena, pero ahora el inventario real se asigna sobre
ella en orden, y los micrófonos que exceden la plantilla generan canales extra.
Si cargás 20 micrófonos, ves los 20.

El phantom también se deriva del micrófono real en vez de venir fijo de la
plantilla.

---

## Cobertura de motores: 46 % → 62 %

| Motor | Antes | Ahora |
|---|---|---|
| `channels-engine` | 0 % | **100 %** |
| `early-reflections` | 0 % | **100 %** |
| `live-engine` | 0 % | **100 %** |
| `dsp-engine` | 0 % | 98.7 % |
| `time-align` | 0 % | 90.6 % |
| `modal-eq` | — | 98.6 % |
| `pa-toolkit` | — | 90.1 % |

22 tests nuevos. Los de `early-reflections` verifican física real: que ninguna
reflexión llegue antes que el directo (error de signo en el método de fuente
imagen), que las paredes laterales sean simétricas en una sala simétrica, y que
la primera nula del comb filter caiga en `f = 1/(2·Δt)`.

Los de `live-engine` verifican que el arranque encienda el DSP **antes** que la
amplificación —al revés metés un golpe por los parlantes— y que el procedimiento
de emergencia empiece por mutear.

**Un dato incómodo que encontré**: `calculateEarlyReflections` es un motor
completo, correcto, que **ninguna pantalla llama**. Está implementado y no se usa
en ningún lado.

### Lo que sigue sin cubrir

`stage-engine` (0 %), `system-vitals` (24 %), `dynamics` (52 %), `pa-engine`
(67 %). `system-vitals` bajó de cobertura relativa porque le agregué código —
`sceneToSources` ahora es compartido y no tiene tests propios.

---

## Componentes: por qué NO terminé la migración

Quedan `compare` (30 estilos inline), `settings` (24), `scenes` (18, sobre
`premium.tsx`) y `shared` (2).

**Decidí no migrarlas a ciegas.** `PremiumCard` usa fondo translúcido
(`rgba(255,255,255,0.02)`) y mi `Card` usa sólido (`var(--sm-card)`): no son
intercambiables sin mirar el resultado. Migrar cuatro páginas sin poder ver
ninguna sería exactamente el riesgo del que te vengo advirtiendo toda la
auditoría.

Lo mismo con los radios: hay **siete valores distintos** para lo mismo (12, 14,
16, 18, 20, 22, 24 px). Pasar 16 tarjetas de 22px a 18px es un cambio visible.
Dejé las clases `.r-card`, `.r-control` y `.r-pill` listas sobre los tokens, para
migrar página por página mirando cada una.

Es tu decisión de diseño, no mía, y necesita ojos.

---

## Estado final de toda la auditoría

**9 casos de "la app afirmaba algo que no era"**, todos corregidos:
SPL inflado 6 dB · PANIC MUTE que no muteaba · "Compliance 100%" que era
headroom · veredicto normativo desde un micrófono sin calibrar · "Butterworth"
que era Linkwitz-Riley · la misma curva mal en el PDF al cliente · comparación
de escenas con otra física · distancia de delay con otra velocidad del sonido ·
patch que ignoraba tus micrófonos.

**Duplicaciones eliminadas**: 7 copias de la ganancia de array, 7 de la
velocidad del sonido. Ahora hay una de cada una, con tests de consistencia
motor↔vista que fallan si alguien vuelve a reimplementar física en una pantalla.

**Bundle**: 940 → 240 kB gzip. **Navegación**: 2 pantallas rescatadas del
olvido, 3 generaciones de nav reducidas a una. **Android**: keystore conectada,
los releases ya se firman.

---

## Lo único que no cambió en toda la auditoría

**No abrí la app en un navegador. Ni una sola vez.**

Todo fue análisis estático, tests y build. Encontró nueve afirmaciones falsas y
un motor entero sin usar — pero no puede decirte si algo se ve mal.

Sin verificar visualmente: la paleta unificada, los campos de Ambiente en el
escaneo, el kiosk apaisado, los estados vacíos nuevos, las primitivas de
`vitals/` y el panel de resumen de sesión.

Ese es el trabajo que sigue, y es tuyo: `npm run dev`, recorrer, y decirme qué
se rompió.
