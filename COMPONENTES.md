# Sistema de componentes — estado y plan

## El hallazgo: no eran dos sistemas, son cuatro

| Sistema | Exports | Páginas que lo usan |
|---|---|---|
| `soundmap/ui.tsx` (v4) | 20 | 12 |
| `soundmap/vitals/` (v5) | 9 | 5 |
| `soundmap/premium.tsx` | 5 | 1 (`scenes`) |
| `soundmap/empty-state.tsx` | 1 | 3 |

**1334 líneas de capa de UI** haciendo trabajo solapado. `premium.tsx` es un
shell completo (`PremiumShell`, `PremiumCard`, `QuietButton`, `PremiumDivider`)
que existe para **una sola página**.

Duplicaciones literales: `ProgressRing` está en `ui.tsx` y en `vitals/` con dos
implementaciones distintas. Hay **cuatro** tarjetas de métrica —`MetricCard`,
`DashboardCard`, `AudioMetricCard`, `StatCard`— haciendo esencialmente lo mismo.

Y 6 páginas no usan ninguno: 322 estilos inline, 33 radios a mano.

---

## Lo que hice en esta pasada

### 1. Escala de tokens en `index.css`

No existía ninguna. Por eso había `rounded-[18px]`, `[20px]` y `[22px]` conviviendo
sin criterio.

```css
--radius-card: 18px;  --radius-control: 12px;  --radius-pill: 999px;
--space-1..7: 4 8 12 16 24 32 48px;
--elev-0/1/2/accent;   /* en dark plano la jerarquía la da el hairline */
```

### 2. `vitals/primitives.tsx` — lo que le faltaba a la v5 para reemplazar a la v4

```
Superficie → Card (4 tonos), Hairline
Layout     → ScreenShell, SectionHeader
Acción     → PrimaryButton, SecondaryButton, IconButton
Feedback   → StatusPill, WarningBanner, EmptyState, Skeleton
```

Dos decisiones deliberadas:

- **`IconButton` exige `label`.** Es `aria-label` y `title` a la vez, así que no
  se puede crear uno inaccesible por descuido. El tipo lo impide.
- **`EmptyState` acepta `action`.** Un estado vacío sin salida es justo lo que
  rompe el "hacia dónde puedo ir". La prop empuja a que siempre haya una.

Regla para adelante: **una tarjeta de métrica, no cuatro. Un `ProgressRing`, no
dos.** Si necesitás una variante, agregá una prop — no un componente.

### 3. Migración de prueba: `community-gear`

Reemplacé el vacío y la carga escritos a mano. De paso, el spinner anterior
colapsaba el layout al cargar; el `Skeleton` reserva el alto y la lista ya no
salta. Y el vacío de "pendientes" ahora ofrece "Ver los aprobados" en vez de
dejarte sin salida.

### 4. El primer test de flujo de UI del proyecto

Extraje las reglas del wizard a `pages/design-wizard/flow.ts` — `wizardCompletion`,
`wizardBlocker`, `firstIncompleteStep`, `wizardProgress`— y les escribí 15 tests.

**Sin agregar dependencias.** `@testing-library` + `jsdom` habrían sido ~40 MB, y
acababa de sacar la única dep que había agregado. Estas reglas son lógica de
dominio, no presentación: separarlas es mejor diseño *y* las hace testeables en
`environment: "node"`.

Un test que vale la pena señalar: verifica que **si un paso bloquea, el destino
al que te manda el botón de rescate esté accesible**. Sin eso podrías mandar al
usuario a otro paso bloqueado — un callejón dentro del callejón.

**155 tests** (antes 140).

---

## Plan para terminar

**Paso A — las 6 páginas sin sistema.** Máximo beneficio, mínimo riesgo: no hay
que desarmar nada, sólo cambiar inline por componente.
`compare` (30 inline) → `settings` (24) → `scenes` (18) → `kiosk` (9) → `shared` (2).
`community-gear` ya está hecha parcialmente.

**Paso B — absorber `premium.tsx`.** Existe para una sola página. `PremiumCard`
es `Card` con otro nombre; `QuietButton` es `SecondaryButton`. Migrar `scenes` y
borrar el archivo.

**Paso C — las 12 páginas en `ui.tsx`.** El grueso. Por página, empezando por las
que menos exports usan.

**Paso D — borrar `ui.tsx`.** Recién cuando nadie la importe.

> No hagas B, C ni D de un tirón sin mirar el resultado. Cada página migrada hay
> que verla en el navegador antes de pasar a la siguiente.

---

## Advertencia

**No abrí la app en un navegador ni una vez.** `Card`, `EmptyState`, `Skeleton` y
todo `primitives.tsx` compilan y tipan, pero **nadie los vio renderizados**. La
migración de `community-gear` es la única que toca píxeles visibles y está sin
verificar.

Antes de seguir migrando páginas: `npm run dev`, entrá a Comunidad con el filtro
en "pendientes" y confirmá que el vacío se ve bien. Si ese se ve bien, el resto
del sistema probablemente también.
