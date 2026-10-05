# Auditoría de UX e información — SoundMap

Estado tras esta pasada: `tsc` limpio · **140 tests** en verde · `eslint` 0 errores.

---

## 1. El problema central: no hay un mapa mental único

Tu pedido fue *"que automáticamente pueda identificar hacia dónde ir y hacia dónde
puedo ir"*. Hoy no se puede, y la causa no es visual: es que **la app tiene tres
generaciones de navegación superpuestas** y ninguna fue retirada.

- **v4** — `Index.tsx` (`/legacy`), con `SidebarNav` + `PageHeader`.
- **v4.5** — `design-hub`, un hub de diseño con progreso propio.
- **v5** — `AppShellV5` + `BottomNav` + `DesignWizard`, la que ves hoy.

Las tres siguen en el código. El resultado medible:

| Síntoma | Dato |
|---|---|
| Pantallas reales | 15 |
| Con acceso directo desde la barra inferior | 8 |
| **Inalcanzables (0 enlaces en toda la app)** | **2** — `/toolkit`, `/export` |
| Sólo alcanzables desde una página muerta | 2 — `/pa`, `/templates` |
| Páginas muertas | 2 — `design-hub` (312 líneas), `Index` (`/legacy`) |

`/toolkit` son tus tres calculadoras (cardioide, ángulos de line array,
impedancia) y `/export` es el reporte PDF del sistema. **Dos de las funciones más
útiles del producto sólo se alcanzaban escribiendo la URL a mano.**

### Lo que ya arreglé

- `/toolkit` y `/export` ahora están en las acciones rápidas del FAB.
- `design-hub` eliminada (−312 líneas).

### Lo que falta y es decisión tuya

`/legacy` sigue viva y es el único enlace a `/pa` y `/templates`. Antes de
borrarla hay que decidir qué pasa con esas dos: `/pa` parece solaparse con el
paso "PA" del wizard, y `/templates` no tiene lugar asignado en la v5. Son
funciones, no basura — necesitan casa.

---

## 2. El wizard mentía sobre tu progreso

Tres bugs de flujo, los tres arreglados:

**a) Los pasos 4 y 5 nunca se completaban.** `completed` tenía
`patch: false, save: false` **hardcodeados**. Hicieras lo que hicieras, los chips
de "Patch" y "Guardar" quedaban grises para siempre y la barra de progreso nunca
llegaba al final. Ahora se derivan de `mics.length` y `scenes.length`.

**b) Dos barras inferiores solapadas.** La barra de acciones del wizard estaba en
`bottom-16` (64px fijos) y el BottomNav mide 72px + safe-area. En cualquier
teléfono con home indicator, una tapaba a la otra. Ahora usa
`calc(var(--sm-bottom-nav) + env(safe-area-inset-bottom))`.

**c) Podías saltar a un paso vacío sin explicación.** Nada impedía ir directo a
"DSP" sin haber cargado sala ni PA — llegabas a una pantalla vacía sin saber por
qué. Ahora cada paso declara su requisito, y si no se cumple ves *qué* falta y un
botón que te lleva exactamente al paso que lo desbloquea.

Ese último punto es literalmente lo que pediste: la app ahora te dice hacia dónde
ir cuando estás donde no corresponde.

---

## 3. Componentes: dos sistemas de diseño en paralelo

Este es el trabajo más grande que queda, y es la raíz de por qué la app se siente
inconsistente.

**Coexisten dos librerías que hacen lo mismo:**

| | `components/soundmap/ui.tsx` | `components/soundmap/vitals/index.tsx` |
|---|---|---|
| Generación | v4 | v5 (la actual) |
| Exports | 20 | 9 |
| Páginas que la usan | 9 | 3 |

**Cómo quedó repartido:**

- **2 páginas mezclan las dos** — `channels`, `stage-map`
- **9 páginas usan sólo la v4 legacy** — `dsp`, `export-page`, `gear-builder`,
  `live`, `pa`, `room-scan`, `shared-dsp`, `templates`, `toolkit`
- **3 páginas usan la v5** — `ai-home`, `design-wizard`, `perform-hub`
- **6 páginas no usan ninguna**: todo inline — `compare` (30 estilos),
  `settings` (24), `community-gear` (23), `scenes` (18), `kiosk` (9), `shared` (2)

**Duplicación literal**: `ProgressRing` existe en ambos archivos, con
implementaciones distintas. Y hay **cuatro** componentes de tarjeta de métrica que
hacen esencialmente lo mismo: `MetricCard`, `DashboardCard`, `AudioMetricCard`
(en ui.tsx) y `StatCard` (en vitals).

**Números crudos**: 322 estilos inline en `pages/`, 33 radios hardcodeados
(`rounded-[18px]`, `rounded-[20px]`, `rounded-[22px]`) pese a que existe
`--radius`.

### Propuesta de arquitectura

No recomiendo reescribir. Recomiendo **converger sobre `vitals/` y migrar por
página**, en este orden:

**Paso 1 — Cerrar el vocabulario.** Definir en `vitals/` el set mínimo y prohibir
crecer fuera de él:

```
Surface   → Card, Panel, Hairline
Data      → StatCard, MetricRow, DeltaChip, ProgressRing, Gauge
Action    → PrimaryButton, SecondaryButton, IconButton, Fab
Feedback  → StatusPill, WarningBanner, EmptyState, Skeleton
Layout    → ScreenShell, SectionHeader, StepHeader
```

Una tarjeta de métrica, no cuatro. Un `ProgressRing`, no dos.

**Paso 2 — Tokens, no literales.** Los 33 radios y buena parte de los 322 estilos
inline salen de que no hay escala. Falta declarar y usar:
`--radius-card`, `--radius-pill`, `--space-{1..6}`, `--elev-{0,1,2}`.

**Paso 3 — Migrar por página, empezando por las 6 sin sistema.** Son las que más
se benefician y las que menos riesgo tienen (no hay que desarmar nada, sólo
reemplazar inline por componente). `compare` y `settings` primero.

**Paso 4 — Recién ahí, borrar `ui.tsx`.**

---

## 4. Buenas prácticas que faltan

- **`data-testid` sí, tests de UI no.** Hay testids por todos lados (señal de que
  alguna herramienta los generó), pero **cero tests de componentes**. Los 140
  tests son todos de motores. Un `@testing-library/react` sobre el wizard te
  habría cazado el bug del progreso hardcodeado.
- **Sin estados de carga ni error consistentes.** Cada página resuelve el vacío a
  su manera; existe `empty-state.tsx` pero no todas lo usan.
- **Accesibilidad mínima.** Agregué `aria-current`, `role="dialog"` y Escape en el
  FAB, pero el resto de la app no tiene foco visible consistente ni landmarks.
- **`min-h-screen` anidado** dentro de un shell que ya es `100dvh`, en varias
  páginas. Genera scroll fantasma.

---

## 5. Lo que sigo sin poder afirmar

**No abrí la app en un navegador. Ni una vez.** Todo esto es análisis estático:
lectura de código, grafo de rutas, conteo de referencias. Es sólido para
detectar pantallas inalcanzables, progreso hardcodeado y barras solapadas —
pero **no me dice si algo se ve mal**.

Antes de seguir con lo visual, corré `npm run dev` y recorré el wizard completo.
Los cambios de esta pasada tocan justamente el flujo que más vas a mirar.
