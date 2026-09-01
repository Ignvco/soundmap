# SoundMap Design System v6

`tsc` limpio · **244 tests** · `eslint` 0 errores · build OK · 0 dependencias nuevas

---

## Primero: no nos adelantamos tanto

Dijiste que cometimos un error de orden. Fui a medirlo antes de asumirlo, y la
situación es mejor de lo que parecía: **buena parte del design system ya estaba
construido**, porque el rediseño lo fue creando por necesidad.

| § del brief | Estado previo |
|---|---|
| 04 Color · 08 Radius · 09 Borders · 10 Shadows | ✅ ya existía |
| 06 Geist · 13 Navegación · 14 Metric · 21 Motion · 22 Lucide | ✅ ya existía |
| 07 Spacing | parcial (8 de 12 pasos) |
| 11 Botones | 4 de 7 variantes |
| 12 Inputs · 15 Estado · 18 Cards · 19 Listas · 20 IA | sin consolidar |
| **26 Showcase** | **faltaba** |

O sea: el trabajo no se perdió. Lo que faltaba era **consolidar y hacerlo
visible**, que es lo que hice ahora.

---

## Lo que se agregó

### Escalas completas (§06, §07)

**Tipografía nombrada** — cada rol define tamaño, interlineado, peso y tracking
*juntos*. Si sólo se define el tamaño, cada pantalla inventa el resto y la
jerarquía se desarma:

```
.t-display 42px · .t-heading 30px · .t-title 20px
.t-body 14px · .t-small 13px · .t-label 11px · .t-caption 10px
.t-mono → Geist Mono + tabular-nums
```

**Espaciado** completo 4→96 px, y **alturas de control** (`32/40/48`) para que
todos los inputs coincidan, que es el §12.

### `controls.tsx` — §11, §15, §19, §20

- **Button**: 4 variantes × 3 tamaños. El `pill` es opcional y se reserva para
  la acción primaria — el brief dice literal *"No convertir todos los botones en
  pills"*.
- **IconBtn**: `label` obligatorio. Es `aria-label` y `title` a la vez, así que
  el tipo hace imposible crear uno inaccesible.
- **StatusDot**: los 7 estados del brief (live, optimized, healthy, warning,
  offline, processing, analyzing). Punto de 6 px, sin fondo ni borde — *"pequeños
  indicadores, no enormes badges"*. El color ya comunica; un chip relleno lo
  diría dos veces.
- **List / ListRow / ListIcon**: *"las listas deben sentirse más importantes que
  las cards para información estructurada"*.
- **Recommendation**: obliga a separar el **hallazgo** de la **acción**. Si no
  podés formular una acción concreta, es un comentario, no una recomendación —
  eso es lo que separa "SoundMap Intelligence" de un chatbot.

### `/design-system` — §26

La fuente visual de verdad. Color, tipografía, métricas, botones, estados,
superficies, listas, controles, IA y feedback, todo en una página.

Sirve además como **test visual**: cambiás un token y ves todo lo afectado de una
vez, sin recorrer quince pantallas.

---

## Un error mío que corregí sobre la marcha

Al crear `controls.tsx` dupliqué los botones que ya estaban en `primitives.tsx`
— exactamente el *"10 componentes visualmente distintos que hacen lo mismo"* que
el brief prohíbe, y lo introduje yo.

`PrimaryButton`, `SecondaryButton` e `IconButton` ahora son envoltorios finos
sobre `Button` / `IconBtn`. Los ~20 sitios que los importan siguen funcionando,
pero hay **una sola implementación** debajo.

---

## §27 — Auditoría de calidad

Barrido final de valores arbitrarios: **25 archivos actualizados**, mapeando hex
sueltos a tokens con criterio semántico (neutros → foreground/background,
teal → info, violeta/ámbar → warning, magenta/rojos → destructive).

Los más cargados eran `toolkit` (23 hex), `spl-meter` (18) y `stage-map` (10).

Y verifiqué el error que ya había cometido una vez: **cero** concatenaciones
rotas del tipo `var(--sm-warm)55` — que no es un color válido — y **cero** `var()`
en canvas o jsPDF, donde las variables CSS no resuelven.

---

## Cómo usarlo de ahora en más

```tsx
import {
  Button, IconBtn, StatusDot, List, ListRow, Recommendation,
  Metric, MetricRow, Card, EmptyState,
} from "@/components/soundmap/vitals/index.tsx";
```

Un solo punto de entrada. Y la regla que hace que esto funcione:

> Si necesitás un color, un radio o un espaciado que no está en los tokens,
> el problema es el diseño, no los tokens.

---

## Lo que sigue

Con el sistema construido, ahora sí tiene sentido lo que pediste antes: **las
pantallas propias de SPL Analysis y Acoustic Analysis**. Al tener `Metric`,
`List`, `StatusDot` y las escalas listas, esas pantallas se arman con piezas
existentes en vez de inventar una octava variante de tarjeta.

---

## Sin verificar

**`/design-system` no lo vi renderizado**, y es la página que más importa que se
vea bien: si algo está mal ahí, está mal en toda la app.

Abrila primero. Es la que te va a decir de un vistazo si el ADN visual quedó
coherente.
