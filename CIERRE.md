# Cierre de deuda técnica

`tsc` limpio · **218 tests** (antes 181) · `eslint` **4 warnings** (antes 5) · build OK
`package.json` y `package-lock.json` byte a byte idénticos a tu original · **0 dependencias nuevas**

---

## El séptimo `[0]` estaba en `stage-engine`

```js
const topCoverage = tops.length > 0 ? (tops[0].coverageH ?? 90) : 90;
```

**La cobertura del sistema salía del primer top de la lista.** Con un rig mixto
—un top de 90° y otro de 60°— el porcentaje de cobertura que la app te reportaba
**dependía del orden en que cargaste las cajas**. Mismo rig, distinto número.

Arreglado: ahora la limita la caja **más cerrada**, que es la honesta. Hay un
test que verifica que invertir el orden de la lista no cambie el resultado.

Van siete módulos con el mismo patrón. Los siete corregidos.

---

## Cobertura de motores: 62 % → 68 %

| Motor | Antes | Ahora |
|---|---|---|
| `stage-engine` | **0 %** | **100 %** |
| `dynamics` | 52 % | **100 %** |
| `system-vitals` | 24 % | 43 % |
| `acoustics`, `live-engine` | — | 100 % |
| `dsp-engine`, `modal-eq`, `spl-grid` | — | 98–99 % |

37 tests nuevos. Los de `stage-engine` verifican cosas que importan físicamente:
que las posiciones queden **dentro** del escenario, que sean simétricas respecto
del centro, que el fondo de sala siempre reciba menos SPL que el frente, y que
si hay torres de delay el tiempo total **supere** el de propagación (si no, la
torre suena antes que el escenario y se pierde la localización).

Los de `dynamics` confirman algo que estaba bien y vale la pena que sepas:
`pickDrivingAmp` elige el amplificador **más potente** de los seleccionados. Es
la decisión correcta para un limitador — es el peor caso para el parlante.
También verifican que a 4 Ω el amp entregue más potencia que a 8, pero **nunca
el doble**, porque las pérdidas internas son reales.

### Lo que sigue sin cubrir, y por qué

- `pa-engine` 67 % — lo no cubierto es generación de texto y recomendaciones.
- `rt60-measure` 28 % — necesita audio real; no se testea sin mock de Web Audio.
- `test-signals` 2 %, `gear-database` 0 % — generadores de tono y datos estáticos.

Esos tres últimos no valen tests unitarios. `pa-engine` sí, pero es la parte
narrativa, no la de cálculo.

---

## Higiene

**Un warning de lint menos.** Quedan 4, todos `react-refresh/only-export-components`:
son archivos que exportan un componente y además una constante. Es una molestia
de hot-reload en desarrollo, no un bug. Arreglarlos implica partir archivos, y no
me pareció que valiera el ruido en el diff.

**Los lockfiles no los toqué, a propósito.** `pnpm-workspace.yaml` tiene
configuración deliberada (`minimumReleaseAge`, `blockExoticSubdeps`,
`onlyBuiltDependencies`), así que **pnpm es el gestor intencionado** del
proyecto. Pero yo verifiqué todo con npm. Borrar el equivocado te haría
reinstalar y quizá pelear con versiones: es un comando de una línea para vos, y
un error caro si lo elijo mal. Mi recomendación: quedate con pnpm y borrá
`package-lock.json`.

**`versionCode` sigue en 1** y **la keystore sigue en el historial de git.**
Tampoco los toqué: bumpear la versión sin saber si ya publicaste puede dejarte
un hueco en Play, y reescribir el historial de git es destructivo. Para la
keystore, lo correcto es `git filter-repo` o directamente **generar una nueva y
rotar**, si el repo estuvo expuesto alguna vez.

---

## Lo que sigue siendo decisión tuya

**`calculateEarlyReflections`** — motor completo, correcto, con 100 % de
cobertura ahora… que **ninguna pantalla llama**. Calcula reflexiones tempranas
por el método de fuente imagen: comb filtering, primera nula, tratamiento
sugerido por superficie. Es información genuinamente útil para tratar una sala.
O lo conectás (yo lo pondría en el escaneo, junto al RT60) o lo borrás. No lo
decido yo.

**i18n** — selector funcionando, ~18 pantallas todavía en español hardcodeado.

**`/legacy`** — sigue viva y es el único camino a `/pa` y `/templates`.

**El escaneo sigue siendo teatro** — barra de progreso falsa de 2 s con
`Math.random()` para un cálculo instantáneo.

**Migración de componentes** — 3 de ~15 páginas. Siete radios distintos. Los
tokens y las clases `.r-card` / `.r-control` / `.r-pill` están listos.

Ahora que **ya viste la app funcionando**, esta migración sí se puede hacer con
seguridad: página, mirar, siguiente. Antes no.
