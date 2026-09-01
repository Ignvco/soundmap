# Reflexiones tempranas conectadas + consolidación de tokens

`tsc` limpio · **221 tests** · `eslint` 0 errores · build OK · 0 dependencias nuevas

---

## 1. `calculateEarlyReflections` ya está en la app

Estaba implementado, correcto y con 100 % de cobertura… y ninguna pantalla lo
llamaba. Ahora vive en el **paso 4 del escaneo**, entre el análisis modal y los
indicadores de riesgo — que es donde tiene sentido: ya conocés el RT60, ahora
querés saber *qué superficie* te está coloreando el sonido.

**Qué muestra**, ordenado de peor a mejor (lo que hay que tratar primero, arriba):

| | |
|---|---|
| Superficie | Techo, piso, pared trasera, delantera, laterales |
| Retardo | ms respecto del sonido directo |
| Primera nula | dónde cancela: `f = 1/(2·Δt)` |
| Severidad | Severo / Moderado / Leve |

Debajo, la recomendación del motor y un aviso aparte si alguna reflexión supera
**30 ms** — porque eso ya no es coloración, es eco discreto, y se trata distinto.

### La geometría que le paso

El motor necesita posición de fuente y de oyente; el escaneo sólo tiene
dimensiones. Derivé una geometría de despliegue típica, coherente con la que ya
usa `calculateSubAlignment`: top volado al 75 % de la altura útil, adelantado, y
oyente de referencia a media platea con oídos a 1.5 m.

**Usa la temperatura del recinto**, así que el panel es consistente con los
delays y la absorción del aire.

Escribí 3 tests sobre esa derivación: que la fuente quede **dentro** de la sala
en cualquier geometría razonable (incluido un techo de 2.5 m y una nave de 60 m),
que produzca reflexiones utilizables, y que un techo bajo dé una reflexión de
techo más temprana. Sin eso, una derivación mala habría producido números basura
sin que nada avisara.

---

## 2. Consolidación de tokens: 108 literales eliminados

Había **108 valores hex escritos a mano que duplicaban tokens ya definidos**:
`#C9F03E` (31 veces), `#F5B62E` (24), `#FF6B4A` (8), `#4A6BFF` (7), `#8E8E93` (7).

Reemplazados por `var(--sm-accent)`, `var(--sm-amber)`, etc.

**Es pixel-idéntico**: cada hex era exactamente el valor del token. No cambia
nada visualmente. Lo que cambia es que si algún día tocás la paleta, no te quedan
108 literales desincronizados por ahí.

### Y encontró tres roturas reales

El reemplazo automático rompió tres lugares donde el color se concatena con
alfa: `#FF6B4A55` es un hex válido de 8 dígitos, pero `var(--sm-warm)55` **no es
nada**. Estaban en `premium.tsx` (2) y `spl-heatmap-2d.tsx` (1).

Los revertí a literal y verifiqué que no quede ninguna otra concatenación rota,
ni `var()` en contextos que no lo soportan (canvas, jsPDF, props de recharts).

---

## 3. Lo que decidí NO migrar, y por qué

`compare` tiene identidad visual propia: fondo `#0F1012`, sombras específicas,
radios de 22px. `PremiumCard` usa fondo translúcido. Mi `Card` usa
`var(--sm-card)` sólido.

**Reemplazarlas cambiaría cómo se ve la app** — y me acabás de decir que se ve
bien. Eso ya no es consolidación técnica, es rediseño, y es tu decisión.

Lo mismo con los radios: `rounded-[18px]` → `.r-card` es pixel-idéntico y se
puede hacer sin riesgo, pero `[22px]` y `[20px]` no. Migrar sólo los de 18px
dejaría la inconsistencia igual, así que no gané nada haciéndolo a medias.

**Mi recomendación**: elegí UN radio de tarjeta (yo iría por 18px, que es el que
más se repite después del 22) y aplicalo a todo de una, mirando el resultado.
Es media hora tuya con la app abierta, y cierra el tema de verdad.

---

## Estado de la deuda

| | |
|---|---|
| `calculateEarlyReflections` sin usar | ✅ conectado |
| Hex duplicando tokens | ✅ 108 eliminados |
| Cobertura de motores | 68 % — `stage-engine` y `dynamics` al 100 % |
| Patrón `[0]` | ✅ los 7 casos corregidos |
| Migración de componentes | pendiente, ahora es decisión visual tuya |
| i18n a medias | pendiente, decisión de producto |
| `/legacy` viva | pendiente, decisión de producto |
| Escaneo con progreso falso | pendiente, decisión de producto |

---

## Sin verificar

El panel de reflexiones tempranas **no lo vi renderizado**. Es una tabla de 6
filas con cuatro columnas en un ancho de teléfono: es exactamente el tipo de
layout que se apretuja. Andá a Diseño → Recinto → completá el escaneo y mirá el
paso de resultados.

Si las columnas no entran, decime y lo paso a dos líneas por superficie.
