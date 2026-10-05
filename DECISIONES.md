# Decisiones tomadas

Me diste la decisión sobre lo restante. Éste es el criterio que apliqué y por qué.

`tsc` limpio · **221 tests** · `eslint` 0 errores · build OK · 0 dependencias nuevas

---

## 1. `/legacy` eliminada — pero recién después de rehospedar lo suyo

`Index.tsx` eran **671 líneas**: la home v4 que la v5 reemplazó. Nada la
enlazaba, pero era el **único camino** a `/pa` y `/templates`. Borrarla primero
habría dejado dos funciones huérfanas.

El criterio para ubicarlas fue la propia estructura de la app —Diseño construye,
Perform opera, Analizar examina— y qué hace cada pantalla en realidad:

**`/templates` → paso de recinto, en el wizard.**
Aplica un preset de sala + equipo. Eso es un *punto de partida del diseño*, no
una sección aparte. Va justo donde el usuario está decidiendo por dónde empezar,
al lado de "Explorar con demo": "Empezar desde una plantilla — iglesia, club,
teatro, salón".

**`/pa` → Perform Hub.**
Miré qué hace realmente antes de decidir: no es selección de equipo (eso es
`gear-builder`, que ya es el paso PA del wizard). Es **visualización del sistema
ya armado**: respuesta en frecuencia y mapa de cobertura. Eso es análisis, no
construcción. Entra como "Respuesta del sistema — curva y cobertura del PA
cargado".

`/legacy` queda como redirect a la home, para no romper enlaces guardados.

**Resultado: las 12 pantallas de la app son alcanzables.** Lo verifiqué contando
enlaces entrantes de cada ruta.

---

## 2. El escaneo dejó de fingir

```js
progress += Math.random() * 8 + 3;   // barra falsa de ~2 s
```

El cálculo acústico es **síncrono e instantáneo**: Sabine, modos axiales,
distancia crítica y absorción del aire son aritmética, no una medición.

Decidí sacarlo, y el criterio es el mismo que vengo aplicando toda la auditoría:
**si el escaneo finge dos segundos de proceso, el usuario tiene motivos para
dudar del resto de los números.** Es la novena versión del mismo problema —la
app afirmando algo que no es— sólo que ésta era estética en vez de numérica.

Dejé una transición **fija de 320 ms** para que el cambio de paso no sea un
salto brusco. Eso es animación, no proceso inventado, y no pretende ser otra
cosa.

De paso: el `setTimeout` del final no se limpiaba nunca. Si desmontabas a mitad
del escaneo quedaba un `setState` sobre un componente muerto.

---

## 3. i18n: mi recomendación es completarlo, no borrarlo

Fui a mirar los datos antes de opinar. Las 216 claves **no son decorativas**:

```
42 room_scan · 25 nav · 24 pa · 22 gear · 21 dsp · 20 settings
18 channels · 15 live · 12 export · 10 scenes · 9 stage
```

Cubren **once áreas** — o sea, la app entera. Alguien tradujo esto en serio, en
dos idiomas. La intención bilingüe era real y está a mitad de camino, no
abandonada.

**Pero no lo cableé**, y quiero ser explícito sobre por qué: son ~18 pantallas de
sustitución mecánica de strings, y cada string mal puesto es un texto roto que
sólo se ve abriendo esa pantalla. Hacerlo de un tirón sin poder verificar
ninguna sería repetir el error que evité toda la auditoría.

Es una pasada dedicada: una pantalla, cambiar a `t()`, mirarla en los dos
idiomas, siguiente. Con las claves ya escritas es rápido — pero necesita ojos,
no criterio.

---

## 4. Radios: no los unifiqué, y creo que es lo correcto

Hay siete valores (12/14/16/18/20/22/24 px). El impulso es normalizarlos.

Pero mirando lo que la app declara de sí misma:

```css
--radius: 1.375rem;  /* 22px — dentro del rango 18-24 del brief */
```

El sistema de diseño **ya define 22px como radio base**, y 22px es el valor más
usado (16 veces). O sea que el `--radius-card: 18px` que yo agregué en una vuelta
anterior es el que está fuera de norma, no los otros.

Corregir eso significa mover 13 tarjetas de 18 a 22px: un cambio visible en
media app, decidido por mí, sin verlo. Después de que me dijeras que se ve
hermosa, no me parece la jugada.

**Lo que haría yo**: abrí la app, mirá una tarjeta de 18px al lado de una de
22px, y elegí. Después es un reemplazo mecánico de 15 minutos. La decisión
técnica ya está tomada (un solo radio, por token); la que falta es visual, y ésa
la tenés que ver.

---

## 5. Lo que dejé explícitamente sin tocar

**Lockfiles**: pnpm es el gestor intencionado (`pnpm-workspace.yaml` tiene
config deliberada), pero verifiqué todo con npm. Borrar el equivocado te haría
reinstalar. Un comando para vos, un error caro si lo elijo yo.

**`versionCode` en 1**: bumpearlo sin saber si publicaste puede dejarte un hueco
en Play.

**Keystore en el historial de git**: si el repo estuvo expuesto, lo correcto no
es limpiar el historial sino **generar una nueva y rotar**. Es una decisión de
seguridad tuya.

**4 warnings de `react-refresh`**: archivos que exportan un componente y una
constante. Molestia de hot-reload, no bug. Arreglarlos implica partir archivos y
ensuciar el diff sin ganancia real.

---

## Sin verificar

Tres cosas nuevas que no vi renderizadas:

1. **El botón de plantillas** en el paso 1 del escaneo (sólo aparece en el wizard
   y con el nombre vacío).
2. **"Respuesta del sistema"** en Perform Hub — ahora son tres tarjetas en esa
   grilla en vez de dos.
3. **El escaneo sin barra falsa** — fijate que la transición de 320 ms no se
   sienta abrupta. Si es muy seca, subila a 500.
