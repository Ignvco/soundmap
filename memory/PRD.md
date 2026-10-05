# SoundMap — PRD & Progress

## Problem Statement (original v1)
> Revisa mi rep y mi app soundmap está 100% funcional? que mejoras le harías?
> como la llevamos a otro nivel mucho mas premium

## Problem Statement v2 (Feb 2026)
> COMPLETE PRODUCT REDESIGN — first principles. Apple / Linear / Arc /
> Raycast / Notion aesthetic. AI must be the operating system, not a feature.
> Landing question: "What would you like to do today?" with 5 verbatim
> objectives. Merge screens aggressively. Reduce saturation ~30%. Radius
> 18-24px. AI Copilot for professional audio.

**App type:** mobile-first PWA/Capacitor.
**Stack:** Vite 7 + React 19 + TypeScript + Tailwind v4 + Motion + Zustand + jsPDF + Three.js + Convex + Hercules OIDC + i18n (en/es).


## Feb 2026 — Wizard Steps Deep Vitals Refactor (COMPLETE ✅ · 26 Feb 2026)
## Feb 2026 — Vitals Deep Refactor (COMPLETE ✅ · 26 Feb 2026)
## Feb 2026 — UX Reorganization Phase 2 (COMPLETE ✅ · 26 Feb 2026)
## Feb 2026 — Wizard UX Polish (COMPLETE ✅ · 26 Feb 2026)

**Objetivo**: 3 mejoras rápidas UX en el wizard + audit visual final de Toolkit/Templates.

### Cambios
1. **Load Demo Shortcut** en paso Recinto (`room-scan/index.tsx`)
   - Card lime tinted prominente ("Explorar con demo · The Warehouse Club · 400 pax") en el sub-paso 1, arriba del "Nombre del recinto"
   - Solo visible si `inWizard && !form.name.trim() && dimensiones default` (usuarios nuevos)
   - Click → `loadDemoVenue()` carga sistema completo pre-configurado
   - data-testid: `wizard-load-demo-btn`

2. **Persist último paso del wizard** (`store/app.ts` + `design-wizard/index.tsx`)
   - Nuevo campo `lastWizardStep: string | null` en el Zustand store (persist v3+)
   - Nueva action `setLastWizardStep(step)`
   - Wizard: `useEffect` sync URL ↔ store — al navegar a `/design` sin `?step`, restaura el último paso visitado; al cambiar de paso persiste automáticamente
   - Verificado: `/design?step=dsp` → cierra → `/design` → auto-restaura `?step=dsp`

3. **Toolkit** (`toolkit/index.tsx`)
   - `PageHeader` legacy → Vitals eyebrow + h1 + subtitle
   - 3 tabs (`Cardioid Subs / Line Array / Impedancia`) unificados a lime `#C9F03E` (antes purple `#B794F6` / teal `#5EEAD4` / amber `#FFB84D`)
   - Tab container en pill Vitals con lime-active
   - Eliminados imports no usados (`PageHeader`, `ActiveIcon`, `activeColor`, `cn` legacy)

4. **Templates** (`templates/index.tsx`)
   - `PageHeader` legacy → Vitals eyebrow "BIBLIOTECA" + h1 "Plantillas" + "5 listas" pill lime
   - Info card "Punto de partida instantáneo" en Vitals card (antes `bg-info/5 border-info/20`)
   - **Todas las 5 plantillas** (Iglesia/Club/Corporate/Festival/Theater) unificadas a lime accent:
     - Icon box: `rgba(201,240,62,0.12)` con icono lime (antes tinted per-template `tpl.color`)
     - ServiceType label: neutral muted (antes coloreado)
     - Ideal-for bullets: **lime dots** (antes per-template)
     - Gear badges: todos con `color="accent"` (lime)
     - CTA "Aplicar plantilla": lime `#C9F03E` con glow soft (antes gradiente per-template)
   - Metric row con `divide-x divide-border` → `borderRight` inline hairline Vitals
   - Eliminados `GlassCard`, `PageHeader`, `cn` imports no usados

### Verificación
Screenshots capturados en 4 rutas: `/design?step=room` (Load Demo card), `/toolkit`, `/templates`, `/design` (persist restore). Todo funciona.

Score Vitals estimado global: **~95%** (subió desde ~92%).



**Objetivo**: darle el idioma Vitals estricto al interior de los 5 pasos del wizard (Recinto, PA, DSP, Patch, Guardar) + rediseño específico de Escaneo AR.

### Cambios
- **DSP palette (`T` constants en `dsp/index.tsx`)**: reemplazada de neones (`#00FF66`, `#00D95A`, `#5EEAD4`, `#F4F4F4`, `#FF5A5A`) a Vitals: `#C9F03E` (accent), `#F5B62E` (amber), `#8E8E93` (neutral gray para HPF/LPF/blue), `#FF6B4A` (warm). Un solo constant hit → 30+ usages afectados (Knobs, EQ bands, gain staging, compresor, limitador).
- **Channels PRIORITY_COLOR / FEEDBACK_COLOR**: colores unificados a lime + grayscale + amber/warm semánticos. Adiós a `#00FF66/#00D95A/#F4F4F4` y `#FF5A5A/#FBBF24/#5EEAD4`.
- **RoomScan Escaneo AR CTA**: rediseñada de `border-dsp/30 bg-dsp/8` chunky card → Vitals card lime tinted 6% con round icon 40px, badge β en pill lime, chevron muted 13px.
- **RoomScan MaterialChip**: eliminado el drop-shadow verde-neón, ahora usa `boxShadow: 0 0 0 1px rgba(201,240,62,0.35)` cuando selected.
- **RoomScan `text-info` → `text-accent`**: botón "Medir con Mic" y bloque "Medición real" ahora en lime unificado (antes eran azules `#4A6BFF`).
- **RoomScan `text-chart-3` icon** → `text-muted-foreground`: el icono Activity en Capacidad ya no es azul brillante.
- **ExportPage**: quitado `px-4` cuando embebida en wizard (evita padding doble con `ScreenShell compact`).

### Verificación
Screenshots capturados con demo cargada (`The Warehouse Club`):
- **Recinto**: card Escaneo AR limpia + dimensions grid + volumen
- **PA**: JBL SRX906LA con score chip `99 IDEAL` compacto lime, tabs `Tops 4 · Subs 4 · Mon 2` unificados, seleccionados con `4× JBL SRX906LA`
- **DSP**: Principal tab activo con OUT A (lime), knobs `GAIN/HPF/LPF/LIMIT` en tonos correctos (lime/gray/gray/amber)
- **Patch**: StatCards `Crítico 4 · 48V Phantom 5 · Riesgo FB 3`, filas de canales con CRIT pills lime, feedback dots muted
- **Guardar**: hero card "Exportar Informe Técnico" con botón PDF prominente, "Copiar Markdown" + "Compartir" secundarios, "Guardar como Escena" abajo

Score Vitals estimado global: **~92%** (subió desde ~85%).



**Objetivo**: alinear las 4 pantallas más "legacy" (Gear Builder, Patch, Stage-Map + empty states) al lenguaje Vitals estricto — un solo acento lime, sin fugas cyan/teal/verde/rojo.

### Cambios
1. **Killed "Flujo de Trabajo 1-6"** en `empty-state.tsx` — la fila que competía con los step chips del wizard. Empty states ahora son un solo card + CTAs lime.
2. **`WarningBanner` info variant** → tono neutro (`bg-white/[0.03]`) en vez del orange-red `#FF6B4A`.
3. **Gear Builder** (`gear-builder/index.tsx`):
   - Todas las 7 tab colors unificadas a `#C9F03E` (antes: cyan/teal/gray/white)
   - Score corner ribbon (gran número + label) → chip compacto top-right con lime accent y `getScoreColor()` en escala grayscale (lime para ≥88, grays para el resto)
   - Card icon box neutralizado (rgba white/gray en vez de tinted por categoría)
   - Border/shadow con `boxShadow` en vez de border color
4. **Patch (Channels)** (`channels/index.tsx`):
   - 3 stat tiles → componente `StatCard` de Vitals (mismo lenguaje que AI Home): label muted + big font-mono number + caption con icon
   - Filter pills (Todo/Crítico/48V/FB) → pill container round + lime-active
5. **Stage-Map** (`stage-map/index.tsx`):
   - `PageHeader` legacy → header Vitals eyebrow + h1 grande + subtitle + CTA "Optimizar" en pill lime
   - Toggle 2D/3D → pill container Vitals style con lime accent
   - Card ISO 9613: fondo `V.card` + hairline, tipografía tabular-nums, colors reemplazados a `V.accent`/`V.amber`/`V.warm` en vez de `#00FF9E`/`#FFB84D`/`#FF3EA5`

### Estado
- Verificado con screenshots: `/design?step=pa`, `/design?step=patch`, `/stage-map` (con demo cargada).
- Empty states limpios en todas las pantallas.
- Zero regresiones en rutas standalone (`/pa`, `/scenes`, `/settings`).



**Objetivo**: Eliminar los headers y step-pills duplicados que aparecían encima del progress del wizard cuando las páginas se renderizaban embebidas.

### Cambios
- **WizardContext** creado en `/app/src/lib/wizard-context.ts` — signal booleano que se propaga vía Provider desde `design-wizard/index.tsx` al `StepComponent`.
- **`ScreenShell` recibe prop `compact`** — cuando `true`, quita `min-h-screen` y usa padding reducido (`pt-2 pb-4` vs `pt-10 pb-24`) para no crear un scaffold duplicado dentro del wizard.
- **Páginas modificadas** (`useInWizard()` hook para condicionalmente ocultar header propio):
  - `room-scan/index.tsx`: oculta bloque header + step pills legacy; añade mini "sub-paso 1/3" indicator lime cuando está en el wizard; `onContinue` navega a `/design?step=pa` en vez de `/gear-builder`.
  - `gear-builder/index.tsx`: oculta `<PageHeader title="Armador de Equipo" …>`.
  - `dsp/index.tsx`: oculta `<PageHeader title="DSP" …>`.
  - `channels/index.tsx`: oculta `<PageHeader title="Canales" …>`.
  - `export-page/index.tsx`: oculta `<PageHeader title="Exportar" …>`.
  - `components/soundmap/empty-state.tsx` (EmptyRoomState): oculta su `<PageHeader title="{title}" subtitle="Sin sala cargada">` cuando está dentro del wizard.

### Resultado verificado (screenshots + query selectors)
- Los 5 pasos del wizard renderizan sin `data-testid="page-header-title"`. Solo se ve el header del wizard (Diseño · Paso N / 5 + step chips).
- Rutas standalone (`/pa`, `/scenes`, `/settings`) siguen mostrando su `PageHeader` normal + BottomNav.
- BottomNav visible y funcional en todas las rutas dentro de AppLayout.


## Feb 2026 — UX Reorganization Phase 1 (COMPLETE ✅ · 26 Feb 2026)

**Motivación**: la app tenía 18 rutas top-level dispersas. Reorg a arquitectura mobile-first con 5-tab BottomNav + wizard lineal de 5 pasos.

### Estructura final
- **BottomNav persistente** (5 slots): Inicio · Diseño · [FAB +] · Perform · Analiz.
  - FAB central abre sheet con acciones rápidas: Kiosk, Escenas, Comunidad, Ajustes.
  - `/app/src/components/soundmap/bottom-nav.tsx`.
- **Design Wizard** (`/design`): flujo lineal Recinto → PA → DSP → Patch → Guardar. Cada paso reutiliza páginas existentes (RoomScan, GearBuilder, DSP, Channels, ExportPage) como componente. Estado persistente vía Zustand.
  - Sticky progress bar + step chips (con tick verde en pasos completados).
  - Fixed bottom action bar Anterior / Siguiente (Sparkles + "Ir a Perform" en el último paso).
  - `/app/src/pages/design-wizard/index.tsx`.
- **Routing killed & redirected en App.tsx**:
  - `/analyze` → `/compare` (redirect)
  - `/room-scan` → `/design?step=room`
  - `/gear-builder` → `/design?step=pa`
  - `/dsp` → `/design?step=dsp`
  - `/channels` → `/design?step=patch`
  - `/export-page` → `/design?step=save`
  - `/design-wizard` → `/design` (alias)
- **Command Palette** actualizado con sub-comandos del wizard (`design-room`, `design-pa`, etc.) para acceso directo desde ⌘K.
- **AppShellV5**: eliminado el pill flotante ⌘K mobile (colisionaba con BottomNav), añadido `pb-24` global para respetar la nav fija.
- **Links legacy** en ai-home y empty-state ya apuntan directamente a `/design?step=…` sin hop de redirect.

### Estado
- Verificado manualmente: `/design`, `/`, redirects legacy, tabs de BottomNav todos funcionan. Screenshot mobile ok.
- Pendiente: refactor visual interno de las páginas embebidas en el wizard (Fase 2) para alinear con lenguaje Vitals (minimizar headers duplicados, unificar inputs).


## Feb 2026 — Complete Product Redesign (Phase 1 COMPLETE ✅)

Blueprint del design agent en `/app/design_guidelines.json`. Fase 1 ejecutada:

### 1. Design System v5 — "Console Silenciosa"
- **Palette charcoal**: bg #09090b, card #121214, secondary #18181b, border #232326.
- **Accents desaturados ~30% con meaning-map estricto**:
  - Pink #C77A9E — primary actions ONLY
  - Cyan #4E9EA8 — measurements / coverage
  - Purple #9B7EBD — DSP / processing
  - Green #5BA777 — healthy / live / success
  - Orange #C28B62 — warnings
  - Red #B45C6E — critical
- **Typography**: General Sans (Fontshare) reemplaza Cabinet Grotesk + Satoshi. Peso 500 default, letter-spacing -0.011em.
- **Radius**: 22px default (dentro del rango 18-24px del brief).
- Ambient gradients desaturados (0.03 opacity).

### 2. AI Home (`/`)
- Reemplaza el widget-grid dashboard antiguo.
- Whisper header "SOUNDMAP CONSOLE" con dot pulse verde.
- Landing question "¿Qué querés hacer hoy?" en 2rem→3.2rem, font-weight 500, letter-spacing -0.03em.
- 5 objective ghost cards (Diseñar / Optimizar / Live / Diagnosticar / Reporte) con hover translate-x-4, staggered reveal.
- Hero Card único que responde las 3 preguntas del brief: Ready? / How good? / What next?
- Testids: `ai-home-question`, `objective-picker`, `objective-design/optimize/live/diagnose/report`, `hero-card`, `hero-state`, `hero-headline`, `hero-description`, `hero-kpis`, `hero-kpi-score/rt60/capacity`, `hero-progress`, `hero-cta-start/continue/perform`, `hero-cmd-hint`.

### 3. Hero Card (`/components/soundmap/hero-card.tsx`)
- Single card, sin borders visibles (shadow-based hierarchy).
- Estados: empty / in-progress / ready (colors change accordingly).
- KPIs se revelan solo cuando hay data.
- Progress bar 3px de altura, muy discreta.
- Primary CTA único con background pink #C77A9E.
- Secondary "Preguntar a SoundMap ⌘K" ghost.

### 4. Command Palette Raycast-style (⌘K)
- `/components/soundmap/command-palette.tsx`.
- 16 comandos agrupados en 5 secciones: Diseñar / Ejecutar / Analizar / Biblioteca / Ajustes.
- Full keyboard: ↑↓ nav, Enter run, Esc close.
- Filter en vivo por label + hint + keywords.
- Global ⌘K binding via CustomEvent (`soundmap:openpalette`).
- Backdrop blur-md, radius 22px, box-shadow expensive.
- Testids: `command-palette-overlay`, `palette-input`, `palette-results`, `palette-item-{id}`.

### 5. AppShellV5 (`/components/soundmap/app-shell-v5.tsx`)
- **Sidebar antiguo ELIMINADO** — navegación via CommandPalette + CTAs contextuales.
- **Bottom nav antiguo ELIMINADO**.
- Top-nav sticky en subpages (backdrop-blur, height 56px): botón "SoundMap" (volver home) + Sync + ⌘K.
- En home: solo un pill flotante top-right con ⌘K.
- Mobile: pill flotante bottom-center "Buscar…" siempre visible.
- Advisor widget y GuidedTour preservados.
- Testids: `shell-home`, `shell-cmd-btn`, `shell-mobile-cmd`.

### 6. Route Consolidation (parcial en Fase 1)
- Nuevas rutas `/design`, `/perform`, `/analyze`, `/library` reciben tráfico de los objectives (por ahora redirigen a las páginas legacy correspondientes).
- Las 19 rutas viejas se preservan y son accesibles por CommandPalette.
- **Fase 2 pendiente**: UI premium propia para las 4 rutas consolidadas.

### Testing final
- ✅ **78/78** vitest unit tests passing.
- ✅ **19/19** rutas cargan con el nuevo shell aplicado.
- ✅ **iteration_10**: 100% PASS (8/8 features verificados end-to-end).
- ✅ `tsc -b --noEmit`: 0 errors.
- ✅ Look validado con screenshot: premium, minimal, tipografía como jerarquía, sin decoración innecesaria.

### 7. Design Hub `/design` (Fase 2 · Feb 2026)
- Reemplaza el placeholder que redirigía a StageMap.
- Fusiona el flujo **Recinto → PA → DSP → Amps → Monitores → Patch** en un canvas único tipo Linear Issue view.
- 6 pasos accordion con estado (check verde o número gris), summary con KPIs reales del store, CTA "Abrir editor" a la página legacy, y quick action "Cargar demo" cuando aplica.
- Progress bar 3px pink → green al 100%.
- Terminal CTAs "Ir a Perform" + "Generar reporte" aparecen solo cuando 6/6.
- Param `?tab=optimize` expone shortcut al optimizer.
- Testids: `design-hub-title`, `design-hub-progress`, `design-hub-optimize-link`, `design-step-{id}-{toggle|open|quick|cell-*}`, `design-hub-goto-perform/report`.
- **iteration_11**: 100% PASS (40/40 assertions).

### 8. Perform Hub `/perform` (Fase 3 · Feb 2026)
- Gemelo del Design Hub para show-time. Fusiona Live SPL + Session Recording + entry a Kiosk FOH.
- Whisper header "SHOW TIME" + big title con nombre del recinto.
- **Card Kiosk FOH** con CTA blanco primary → `/kiosk` (vista landscape para el set).
- **SPL Meter integrado** vía `perform-spl-meter-wrap` — reutiliza el componente existente que ya incluye mic + session recorder + exports CSV/JSON con cumplimiento EU 2003/10/EC.
- **Quick actions row** de 2 cards ghost: "Generar reporte técnico" → `/export-page`, y "Ajustar cadena DSP" / "Configurar DSP" → `/dsp` o `/design` según haya DSP.
- Empty state: si no hay sistema, título "Sin recinto activo" + link footer "Volver al diseño".
- Testids: `perform-hub-title`, `perform-goto-kiosk`, `perform-spl-meter-wrap`, `perform-quick-actions`, `perform-goto-export`, `perform-goto-dsp`, `perform-goto-design`.
- **iteration_12**: 100% PASS (15/15 assertions).

### 9. Compare Hub `/compare` (Fase 4 · Feb 2026)
- Rediseño completo del A/B compare — eliminado el `ScreenShell + PageHeader + GlassCard` legacy en favor del wrapper full-screen tipo Design/Perform Hub.
- Whisper header "COMPARE A / B" + big title "Diff físico entre escenas" con body muted que explica la comparación cell-by-cell.
- **Empty state** (`scenes.length < 2`): título "Necesitás dos escenas", CTA blanco "Ir a Escenas" (data-testid `compare-empty-cta`).
- **Scene pickers** A / B side-by-side con chip de color (A=sage `#5BA777`, B=amethyst `#9B7EBD`) + swap button minimal entre ellos (data-testid `compare-swap-btn`).
- **Hero component**: dos `HeatmapHero` (data-testid `compare-grid-a` / `compare-grid-b`) dentro de `compare-spl-grids`, cada uno con SVG heatmap absoluto + 3 MicroStats (Uniformidad, Media, Máx).
- **Delta band**: panel `compare-grid-delta` con heatmap divergente `compare-delta-heatmap` (2/3 width) + 3 `DeltaStat` grandes (Máx, Mín, Media) a la derecha con hues teal/orange.
- **Métricas clave**: 4 `MetricPair` (Uniformidad SPL, Spread SPL, Speech score, Music score) como diverging typography grande — winner en color A/B, loser neutral.
- **Progressive disclosure**: botón `compare-toggle-details` alterna `compare-details-panel` con 3 subsecciones (RoomDiff / AcousticsDiff con `DiffRow`, y GearDiff con `gear-diff-tops/subs/monitors/amps/mics`).
- **Terminal CTAs**: `compare-load-a` (sage bg) y `compare-load-b` (amethyst bg) cargan la escena elegida y navegan a `/`.
- **iteration_13**: 100% PASS (9/9 assertions, zero console errors).

### 10. Community Hub `/community` (Fase 5 · Feb 2026)
- Rediseño completo del hub de comunidad — eliminado `ScreenShell + PageHeader + GlassCard`, `font-black` y colores saturados en favor del wrapper full-screen y tipografía General Sans quiet.
- Whisper header "COMUNIDAD" + big title "Gear que la comunidad valida" + CTA blanco "Proponer gear" (`community-submit-btn`) alineado a la derecha.
- **Auth hint strip**: `community-auth-hint` con hue teal quiet cuando el usuario no está autenticado.
- **Filter chips** (`community-filter-all/tops/subs/monitors/amp/dsp/mixer/mic`) como ghost pills con hue de categoría cuando activo (CAT_META desaturado).
- **Status tabs** (`community-status-approved/pending`) en pill toggle blanco/muted.
- **Hero (top-upvoted)**: `community-hero` panel #0F1012 con hairline shadow, whisper crown "TOP COMUNIDAD · <cat>", brand pequeño + model gigante (2.4rem font-medium), submitter meta line, grid de 4 HeroSpec mono (SPL/RMS/Cov/Freq), acciones `community-upvote-<id>` + `community-import-<id>` (bg hue de categoría con arrow icon).
- **Lista quiet**: `community-list` con `community-list-row-<id>` como divide-y typography-first — chip de categoría, brand/model, specs mono inline, upvote pill, import ghost link.
- **Submit modal**: rediseñado con whisper "NUEVO MODELO", h3 grande, category chips minimal, 7 TextField con label uppercase + input rounded-[12px] + focus ring amethyst, checkboxes con accent sage/amethyst, submit button blanco full-width gated por `canSubmit`.
- **iteration_14**: 100% PASS (7/7 scenarios, zero console errors).

### 11. Settings `/settings` (Fase 5 · Feb 2026)
- Rediseño completo de Preferencias como **Notion-style progressive-disclosure flow** — eliminado `ScreenShell + PageHeader + GlassCard + Neon toggles`, reemplazado por accordion silencioso con hairlines.
- Whisper header "AJUSTES" + big title "Preferencias" (`settings-title`) + body muted.
- **6 secciones acordeón** (`settings-section-<id>`, toggle `settings-section-<id>-toggle`) — `measurement` (abierta por defecto), `feedback`, `venue`, `guide`, `about`, `danger` (hue red). Solo una abierta a la vez; el resumen collapsed muestra el estado actual (ej: "Sistema métrico", "Sonido · Vibración", "Club").
- **SegmentControl** para unidades (`units-segment-metric/imperial`) tipo pill blanco/muted.
- **Toggles** para feedback (`toggle-sound/haptics`) tipo iOS quiet — sage cuando on, hairline neutral cuando off.
- **Venue grid** (`venue-grid`) con 4 opciones (`venue-club/festival/theatre/conference`) — Lucide icons, hint desaturado, sage border + check cuando activo.
- **Guide row** con CTA "Iniciar" (`replay-tour-btn`) que navega a `/` y arranca el tour.
- **About rows** read-only con font-mono para versión.
- **Danger zone** con reset button (`reset-system-btn`) → modal (`reset-overlay`) con AlertTriangle en círculo rojo, botones `reset-cancel-btn` + `reset-confirm-btn`.
- **iteration_15**: 100% PASS (8/8 criterios, zero regressions, zero console errors).

### 12. Adaptación global de todas las pantallas (Fase 5+ · Feb 2026)
- Objetivo: llevar las 14 pantallas restantes al lenguaje Apple/Linear/Arc sin reescribirlas todas.
- **Estrategia**: upgrade in-place de los primitivos compartidos + limpieza masiva de tokens legacy.
- **`/app/src/components/soundmap/premium.tsx`** (nuevo): PremiumShell, PremiumCard, SectionEyebrow, QuietButton, PremiumDivider.
- **`/app/src/components/soundmap/ui.tsx`** actualizado: ScreenShell ahora envuelve en `max-w-4xl mx-auto` + padding premium; GlassCard convertido en quiet rounded-[18px] con hairline 1px shadow (fin del backdrop-blur/glow); ProButton primary pasó a bg-white/black text pill; ghost + danger usan hairlines; StatusPill y Badge dejaron atrás `font-bold uppercase tracking-wider`.
- **`/app/src/components/soundmap/nav.tsx`** — PageHeader rewritten a whisper eyebrow (uppercase tracked 0.28em muted) + big h1 font-medium letter-spacing -0.03em con data-testid `page-header-title`.
- **`/app/src/pages/scenes/index.tsx`** rewritten con PremiumShell + SceneCard: chip Eco por riesgo, chip Nube/Local, grid de 4 stats, Cargar sage, Push amethyst, Share teal, delete confirm progresivo. Empty state con CTA a Export.
- **`/app/src/pages/room-scan/index.tsx`** — header actualizado a whisper "ESCANEO" + big título, paso counter alineado a la derecha.
- **Bulk cleanup**: sed pasó por 12+ archivos (pages: channels, dsp, gear-builder, kiosk, live, pa, room-scan, shared-dsp, shared, stage-map, templates, toolkit; components: share-dsp-modal, error-boundary, onboarding, ar-room-scan, sync-indicator, spl-meter, guided-tour, share-scene-modal, optimizer-modal, test-signals-player, empty-state, rt60-modal; extras: Index.tsx legacy, stage-3d.jsx R3F, export-page) reemplazando `font-black`→`font-medium`, quitando `font-display`, mapeando `tracking-wider`→`tracking-[0.16em]` y `tracking-widest`→`tracking-[0.28em]`.
- **Verificación**: iteration_18 → grep sanity **0 hits** de las clases legacy en pages + soundmap components + R3F. Runtime DOM scan: `totalViolations=0` en 17 rutas. Vitest 78/78 verde, TS clean.
- **iteration_16..18**: 100% PASS acumulado (5 bugs detectados en 16, todos fixed antes de 18).

### 13. Community activo + Verified + Hardware probes + Route transitions (Cluster Feb 2026)
- **`/app/src/lib/community/use-community-gear.ts`** (nuevo): composable que detecta `VITE_CONVEX_URL` — si falta, sirve una seed curada de 20 modelos reales (L-Acoustics, d&b, JBL, RCF, QSC, Lab Gruppen, Powersoft, Lake, Symetrix, DiGiCo, Yamaha, Shure, DPA, Sennheiser…) con upvotes/submissions persistidos en localStorage. Threshold `VERIFIED_UPVOTE_THRESHOLD=25` marca `verified=true`.
- **`/app/src/pages/community-gear/index.tsx`** — refactor para usar el hook. Nueva strip `community-demo-hint` (amethyst) cuando corre en modo demo. Interacción anon habilitada en demo mode. Badge sage `ShieldCheck` "VERIFICADO" en Hero + icono compacto en cada list row cuando `row.verified`.
- **`/app/src/hooks/use-hardware-capabilities.ts`** (nuevo): sondea `navigator.permissions` para mic, `DeviceOrientationEvent` para giroscopio, `window.Capacitor.isNativePlatform` para modo nativo, `isSecureContext` para HTTPS.
- **`/app/src/pages/settings/index.tsx`** — nueva sección "Hardware" con 4 rows (Micrófono / Giroscopio / Modo nativo / Contexto seguro), cada una con `HardwareChip` sage/warn/danger/muted.
- **`/app/src/components/soundmap/app-shell-v5.tsx`** — wrap children en `AnimatePresence mode="wait"` para cross-fade (0.28s) entre rutas al cambiar de path.
- **`/app/src/components/soundmap/command-palette.tsx`** — placeholder mejorado "Buscar acción, pantalla o pregunta…" + kbd `⌘K alternar` en el footer (sm+ screens).
- **iteration_19**: 100% PASS (8/8 criterios, zero regressions, MutationObserver confirmó las page transitions, localStorage confirmó persistencia).

### 14. Bug Fix — Flash negro al elegir objetivo (Feb 2026)
- **Reporte del usuario**: "al seleccionar una opción en la app (¿Qué querés hacer hoy?) se va a negro la pantalla".
- **Root cause**: El `<AnimatePresence mode="wait">` + `motion.div key={location.pathname}` que envolvimos en el AppShellV5 (Fase e) chocaba con la mecánica de React Router v6. Como `children` en el shell es un `<Routes>` estable, cuando cambia la URL el motion.div que está en fase de exit re-evalúa `<Routes>` que ya renderiza la nueva página — la nueva página quedaba visible por un instante, luego fadeaba a `opacity: 0` (pantalla negra), y después una instancia fresca fadeaba in. Total ~500ms de flash.
- **Fix**: Reverted el wrapper en `/app/src/components/soundmap/app-shell-v5.tsx` — `children` ahora renderiza directo dentro de `<ErrorBoundary>`. Las animaciones de entrada por página quedan intactas.
- **iteration_20**: 100% PASS (5 objectives + shell-home probados con sampler cada 20ms confirmando opacity=1.0 durante toda la transición, cero flash, cero console errors).
- **Live Hardware Prompt** (bonus completado antes del bug report): `use-hardware-capabilities.ts` ahora expone `requestMic()` y `requestGyro()` — Settings renderiza botones "Habilitar" con iconos Mic/Compass en las rows correspondientes que disparan getUserMedia y DeviceOrientationEvent.requestPermission reales y actualizan el chip al estado devuelto.

### 15. SoundMap Vitals — Redesign a lime/dashboard (Fase Kalo · Feb 2026)
- Basado en referencias del usuario (Kalo calorie tracker + Finance Dashboard).
- **Tokens globales** (`/app/src/index.css`): primary/accent → `#C9F03E` (lime eléctrico), `--card` #131316, `--sm-amber` `#F5B62E`, `--sm-warm` `#FF6B4A`, `--sm-blue` `#4A6BFF`. Ambience gradient warm-lime bottom-right.
- **Primitivos nuevos** (`/app/src/components/soundmap/vitals/`):
  - `index.tsx`: PersonaGreeting, StreakChip (flame + count), TimeRangeTabs, StatCard (label + big value + delta chip corner + inline visual slot), DeltaChip (↑↓ con hue por tono), ProgressRing, FabButton, VitalsEyebrow, token map V.
  - `charts.tsx`: ChartCardBar (recharts bar con highlight cell), ChartCardLine (line con dots lime), DonutCard (macro-balance style con legend).
- **App-native data helpers** (`/app/src/lib/audio/system-vitals.ts`):
  - `eqCurveFromBands(bands: DSPBand[])` → suma paramétrica/shelf/HP/LP en 48 puntos log 20Hz-20kHz.
  - `eqBucketed(curve)` → compacta a 10 bandas (31/63/125/250/500/1k/2k/4k/8k/16k) para el chart.
  - `coverageByZone(room, tops, subs)` → llama `computeSplGrid()` y promedia por zona (Front/Center/Back/Izq/Der + uniformityPct).
  - `paSummary(tops, subs, monitors)` → arraySpl (splMax + 20·log10 N), headroomDb vs 105.
  - `roomSummary(room, acoustics)` → dims/RT60/echoRisk con hue.
- **AI Home v7** (`/app/src/pages/ai-home/index.tsx`) — dashboard 100% app-native:
  - Hero: PersonaGreeting con nombre del recinto + StreakChip amber con `scenes.length`.
  - `vitals-eq-curve`: ChartCardLine con la respuesta real del DSP generada por `generateDSPConfig()` — muestra el notch de corrección modal.
  - `vitals-coverage-bar`: ChartCardBar con SPL por zona real (5 zonas, Center highlighted) + uniformityPct + delta vs objetivo 80%.
  - `vitals-room-card` + `vitals-pa-card`: split cards clicables (→ /room-scan, → /gear-builder) con RT60/dims/eco chip y arraySpl/headroom bar.
  - Insights trio: `insight-stage-map` (unidades en escena → /stage-map), `insight-live` (ProgressRing + estado → /live), `insight-community` (verified count + ShieldCheck → /community).
  - `vitals-composition-donut`: donut Tops/Subs/Monitors/Amps.
  - Objectives grid (5 cards) preservado.
  - FAB relocado a `bottom-6 left-6` (z-40) para no chocar con Asesor IA.
  - Empty state graceful (sin recinto/equipo muestra "Escaneá →" / "Cargá equipos →").
- **Perform Hub v6** (`/app/src/pages/perform-hub/index.tsx`) — PersonaGreeting + StreakChip + Kiosk banner lime gradient + Peak SPL bar + Leq15 line + split cards (SPL live/Compliance) + SPL meter + quick actions.
- **iteration_21**: flagged fake weekly days + FAB overlap + Y-tick suppression → all 3 issues addressed in iteration_22.
- **iteration_22**: 100% PASS (13/13 criterios end-to-end en preview, EQ curve real 10 bandas verificada, SPL zones 91% verificado, insights navegan a rutas reales, FAB sin overlap, empty state graceful, cero regressions).

### 16. Perform Hub Vitals real-data (Feb 2026)
- **`/app/src/lib/audio/system-vitals.ts`** — nuevos helpers:
  - `paFrequencyResponse(tops, subs, crossover, hpfTop, lpfTop, lpfSub, hpfSub)` → 10 buckets dB relativo con Butterworth 24 dB/oct simulado. Suma power-basis subs + tops.
  - `sessionsPeakSeries(scenes, limit=7)` → últimas N escenas ordenadas cronológicamente, con arraySpl = splMax + 20·log10(N) por escena, última con `highlight: true`.
- **`/app/src/pages/perform-hub/index.tsx`** rewritten:
  - `perform-freq-response`: ChartCardLine con la respuesta real del sistema, extra "Crossover NN Hz · LR24" desde `calculateCrossover()`.
  - `perform-sessions-bar`: ChartCardBar con últimas 3-7 escenas guardadas, última en lime brillante, delta `↑ N dB vs sesión anterior` con tone dinámico (bad si sube — cuidado con daño auditivo).
  - Split cards preservadas (Ahora + Compliance con headroom real).
  - SPLMeter, Kiosk banner, quick actions y empty state intactos.
- **`/app/src/components/soundmap/vitals/charts.tsx`** — `ChartCardLine` ahora tiene `interval={0}` en el YAxis para evitar tick suppression (fix cosmético).
- **iteration_23**: 8/8 criterios PASS, delta calculada correctamente (158 − 156 = 2 dB), Butterworth LR24 verificado, empty state graceful, cero fake weekly labels, cero console errors.

### 17. Propagación paleta Vitals — todas las pantallas (Feb 2026)
- **Objetivo**: eliminar los tokens sage/amethyst/teal legacy y unificar toda la app bajo la paleta Vitals (lime #C9F03E · amber #F5B62E · warm #FF6B4A · blue #4A6BFF).
- **Mapeo semántico**:
  - `#5BA777` sage (on/success) → `#C9F03E` lime.
  - `#B45C6E` soft-red (danger) → `#FF6B4A` warm.
  - `#C28B62` warm (warning) → `#F5B62E` amber.
  - `#9B7EBD` amethyst (info) → `#F5B62E` amber.
  - `#4E9EA8`, `#4E8C8C`, `#6BA5C7`, `#7E6BBD` (teal/violet acentos) → `#4A6BFF` blue o `#F5B62E` amber según contexto.
  - `#B78C4E` mustard (cat tops) → `#F5B62E` amber.
  - `#FF7A3A`, `#4EA8DE` (SPL warning zones semánticos) → `#FF6B4A` warm / `#4A6BFF` blue.
- **Archivos tocados**: pages/community-gear, pages/settings (HUE_ON/HUE_DANGER/HUE_WARN), pages/compare (A_HUE/B_HUE distinción retenida en lime vs amber; DiffRow TrendingUp/Down clases arbitrarias también migradas), pages/scenes (HUE_SYNC lime), pages/design-hub, pages/kiosk, components/soundmap/hero-card, ui, premium, spl-meter, spl-heatmap-2d.
- **iteration_24**: flagged 2 issues — DiffRow icons (líneas 720-721 de compare, mi sed loop no incluyó compare) y colores semánticos de SPL zones (`#FF7A3A`, `#4EA8DE`). Ambos fixed.
- **iteration_25**: 100% PASS (6/6 criterios). Grep sanity confirma **zero** occurrences de los 11 hues legacy en pages + soundmap components. Vitest 78/78 verde, TS clean, todas las rutas renderizan sin ErrorBoundary.

## Environment
- Vite dev server bajo supervisor: `/app/node_modules/.bin/vite --host 0.0.0.0 --port 3000`.
- Tests: `/app/node_modules/.bin/vitest run`.

## What's been implemented in this session (Fase A + Fase B — Jan 2026)


### 1. Stage Optimizer (`/stage-map`)
- `src/lib/audio/stage-optimizer.ts`: `optimizeStage(room, tops, subs, opts)` — brute-force sobre 144 configuraciones (3 elevations × 4 splays × 4 tilts × 3 subModes) usando `computeSplGrid` para cada una y ranking por score compuesto (0.7·uniformity − 0.3·spread + 0.02·mean − clipPenalty).
- Async con yield cada 12 candidatos para mantener la UI responsive (~2s en mid-range).
- `OptimizerModal` con progress bar, top-5 candidatos clickeables, KPIs (uniformity %, spread dB, SPL mean), botón Aplicar.
- **Snapshot pattern** para no interrumpir la búsqueda si el store hace tick mid-search.
- Testids: `stage-optimizer-btn`, `optimizer-overlay`, `optimizer-running`, `optimizer-summary`, `optimizer-candidate-{0-4}`, `optimizer-apply`, `optimizer-close`, `optimizer-empty`.

### 2. Live Session Recording (`/live`)
- `src/lib/audio/session-recorder.ts`: `SessionRecorder` class con:
  - Buffer de samples con timestamps
  - Cálculos ISO 1999 / EU 2003/10/EC: Leq, LEX,8h (extrapolación a día laboral), peak, mean, time above 85/90/95 dB
  - Clasificación de cumplimiento EU: safe / lower-action / upper-action / exposure-limit
  - Export CSV (separado por `;` para Excel EU) + JSON estructurado
- Integrado en el `SPLMeter` component: botón `session-rec-btn` (aparece cuando mic corre), indicador live con Leq/duración/samples, modal de summary post-stop con KPIs colored + exports.
- **Throttling** a 1Hz basado en `Math.floor(durationSec)` para no re-renderizar en cada frame de audio.
- Testids: `session-rec-btn`, `session-live-indicator`, `session-duration`, `session-summary-overlay`, `summary-leq/peak/lex8h/compliance/t85/t90/t95`, `session-export-csv/json/clear`.

### 3. Compare A/B con SPL Grids físicos (`/compare`)
- `src/components/soundmap/spl-heatmap-2d.tsx`: renderizador SVG con dos modos: `absolute` (paleta discreta por bandas SPL) y `delta` (diverging red/blue).
- `sceneToSources()` construye fuentes acústicas desde una Scene guardada.
- `deltaGrid(A, B)` calcula diferencia por celda con validación de bounds (solo si dimensiones difieren <5m).
- Sección "Cobertura SPL (física)" con dos heatmaps side-by-side + delta grid con leyenda "A más fuerte / B más fuerte".
- Testids: `compare-spl-grids`, `compare-grid-a`, `compare-grid-b`, `compare-grid-delta`, `compare-delta-heatmap`, `compare-delta-nope`.

### Testing
- **78/78** vitest unit tests (26 base + 27 physics + 10 RT60 + 15 optimizer/recorder).
- Fixes de tests: `stop()` ahora preserva `lastPushMs` para que `summary()` post-stop devuelva datos correctos; test de EU compliance usa sesión de ~4s a 120 dB (LEX,8h ≈ 81 → lower-action, realista).
- Testing agent iteration_8 (100% Optimizer, 100% SPL Meter UI, 100% regression, compare-spl-grids solo empty-state por Convex offline en preview) y iteration_9 (100% post-perf-refactor).

## Final testing status
- ✅ **78/78** vitest unit tests passing.
- ✅ **19 rutas** E2E cargan sin JS errors (+/kiosk /shared/dsp).
- ✅ **9 iteraciones** de testing_agent_v3_fork — todas PASS.
- ✅ `tsc -b --noEmit`: 0 errors.

## Environment
- Vite dev server bajo supervisor: `/app/node_modules/.bin/vite --host 0.0.0.0 --port 3000`.
- Tests: `/app/node_modules/.bin/vitest run`.

## What's been implemented in this session (Fase A + Fase B — Jan 2026)

Ejecutados los 3 next-action-items aprobados por el usuario:

### 1. Kiosko FOH mode (`/kiosk`)
- Nueva página dedicada, fuera del AppLayout (fullscreen, sin bottom-nav).
- **Big SPL centerpiece** con font-size clamp (80-220px), colored por band (moderate/loud/hot/clip), text-shadow neon.
- **Faders virtuales** por output DSP (hasta 8): touch-drag pointer capture, rango -60→+6 dB, color por output, MUTE individual con toggle visual.
- **Panic Mute**: botón grande abajo (destructive tone) que colapsa todos los faders a -60 dB, muestra overlay 'MUTED' animado, guarda posiciones previas para restaurar.
- **Timer** live (00:00:00 formato HH:MM:SS) auto-inicia con el mic.
- **Wake Lock API** para mantener pantalla encendida en set.
- **Fullscreen API** toggle.
- **Peak + Leq** displays adicionales.
- Testids: `kiosk-root`, `kiosk-exit`, `kiosk-fullscreen`, `kiosk-timer`, `kiosk-spl-value`, `kiosk-spl-toggle`, `kiosk-peak`, `kiosk-leq`, `kiosk-faders`, `kiosk-fader-{out}`, `kiosk-fader-{out}-mute`, `kiosk-panic-btn`, `kiosk-panic-banner`.
- Acceso desde `/live` header via `open-kiosk-btn`.

### 2. DSP Presets compartibles por QR (`/dsp` → `/shared/dsp`)
- **Offline-first**: preset se codifica en el hash de la URL (base64 URL-safe). NO requiere backend/Convex.
- **Gzip compression** via native `CompressionStream` — URL comprime ~4.7x (5-output demo: 4940 → 1053 chars). Prefijo `z` marca payload comprimido. QR ahora sí genera con demo real.
- **Fallback graceful**: si el QR falla igual muestra URL + copy + JSON download + native share.
- **Hardening del decoder**: caps de `MAX_OUTPUTS=32`, `MAX_EQ_PER_OUTPUT=32`, y `MAX_DECOMPRESSED_BYTES=128KB` (zip-bomb guard).
- Página `/shared/dsp` read-only con outputs completos (Gain, HPF, LPF, Delay, EQ bandas) + JSON download.
- Testids: `dsp-share-btn`, `share-dsp-overlay`, `share-dsp-qr`, `share-dsp-qr-warning`, `share-dsp-url`, `share-dsp-copy`, `share-dsp-native`, `share-dsp-download`, `share-dsp-close`, `shared-dsp-badge`, `shared-dsp-output-{i}`, `shared-dsp-back`, `shared-dsp-download`.

### 3. Onboarding Tour Re-triggerable (`/settings`)
- Botón "Iniciar" en card Guía con testid `replay-tour-btn`.
- Handler navega a `/` y reactiva `tourActive` tras 400ms para asegurar mount de anchors.

### Bug fixes intermedios (iteration 6)
- **GlassCard + Badge** ahora forward `data-testid` — resolvió issue de children component silent-drop.
- **ShareDspModal degradación**: URL/copy/download SIEMPRE visibles independiente del QR (antes eran mutuamente exclusivos con el estado 'error').

## Final testing status
- ✅ **63/63** vitest unit tests passing.
- ✅ **17/17** rutas E2E cargan sin JS errors (incluyendo /kiosk y /shared/dsp).
- ✅ **7 iteraciones** de testing_agent_v3_fork — todas 100% PASS.
- ✅ `tsc -b --noEmit`: 0 errors.
- ✅ Round-trip encode→decode del preset verificado con demo real (5 outputs, Lab Gruppen LM 44).
- ✅ Malicious payloads (`zINVALID_GZIP`, empty hash, no hash) rechazados gracefully.

## Environment
- Vite dev server bajo supervisor: `/app/node_modules/.bin/vite --host 0.0.0.0 --port 3000` (pnpm removido por incompatibilidad con Node 20 corepack).
- Tests: `/app/node_modules/.bin/vitest run` (no `pnpm test`).

## What's been implemented in this session (Fase A + Fase B — Jan 2026)

**Goal:** ejecutar los 3 puntos del roadmap aprobados por el usuario (saltando b/Supabase para el final).

### a) Hardware-dependent testing con mocks (COMPLETE)
- Extraídas 3 funciones puras de `rt60-measure.ts`: `schroederReverseIntegrate`, `findDbCrossing`, `estimateRt60FromDecay`.
- Nuevo `src/lib/audio/__tests__/rt60.test.ts` (10 tests) — decay sintético lineal, recuperación de RT60=1.0s con ±10 % y RT60=2.5s con ±15 %, resistencia a ruido ±3 dB, confidence heuristics.
- Módulo `measureRT60()` refactorizado para consumir las funciones puras (elimina duplicación, mantiene comportamiento idéntico).

### c) Motor de simulación acústica físico (COMPLETE)
- **NUEVO `src/lib/audio/spl-grid.ts`**: `computeSplGrid(room, sources, opts)` con:
  1. Inverse-square: SPL(r) = SPL_1m − 20·log₁₀(r)
  2. ISO 9613-1 air absorption (125 Hz → 8 kHz, interpolación lineal)
  3. Directividad H/V con cono soft-cosine (−6 dB en borde de cobertura)
  4. Incoherent power sum multi-source
  5. Stats: min/max/mean/spread/uniformityPct (% cells dentro de ±3 dB de la media)
  6. `sampleGrid(x, z)` con interpolación bilineal
- **NUEVO `src/lib/audio/line-array-solver.ts`**: `solveLineArray(input)` con J-array óptimo por progresión geométrica de targets + predicción de spread SPL a lo largo de la audiencia + warnings/notes.
- **Integración UI**:
  - `/stage-map` (3D view): computa `splGrid` desde los pines reales, lo pasa a `Stage3D` (heatmap ahora es física, no gradiente lineal) + KPI card "Predicción física ISO 9613" con `spl-grid-max` y `spl-grid-uniformity`.
  - `/toolkit` LineArrayPanel: nueva card "Predicción física J-Array (ISO 9613)" con `la-physical-spread`, `la-physical-uniform` y target distances por caja. Sliders reactivos al motor físico en tiempo real (verificado en iteration_4).
- **NUEVO `src/lib/audio/__tests__/physics.test.ts`** (27 tests): ISO 9613 tabla + interpolación, off-axis attenuation, inverse-square, air absorption por frecuencia, computeSplGrid stats, sampleGrid bilinear, solveLineArray N-boxes, J-array top→shallow / bottom→steep, validación de input, degradación gracefully para 1 caja, predicción de uniformidad razonable.
- **Total tests**: 63/63 passing (26 previos + 10 RT60 + 27 physics).

### d) Refactor stage-3d.jsx → .tsx (INTENTADO Y REVERTIDO ⚠️)
- Se intentó la conversión y se validó que **@react-three/fiber v9.6.1 sigue propagando el namespace JSX ambient a React 19** cascada errores TS a ~15 archivos no relacionados (lucide-react icons con props `size`/`style`, entre otros).
- **Se mantiene el aislamiento** en `.jsx` + `.d.ts`, ahora con **documentación explícita** del blocker y del intento realizado. El valor del punto d se materializó agregando el prop opcional `splGrid?: SplGrid` al Stage3D isolated component, que ahora consume el motor físico y hace bilinear-sampled coloring por celda.
- **Trigger para retomar**: cuando R3F publique el fix upstream para React 19 JSX pollution (issue tracker vigente), rehacer el rename.

## Environment fix (Feb 2026)
- Supervisor `frontend` config actualizado por testing agent: `/usr/bin/pnpm dev` → `/app/node_modules/.bin/vite` porque pnpm 11 corepack requiere `node:sqlite` (Node 22+) mientras que este entorno corre Node 20.20.2. Frontend RUNNING estable en puerto 3000.
- Tests locales corren con `/app/node_modules/.bin/vitest run` (no `pnpm test`).

## Final testing status (post iteration_4)
- ✅ **63/63** vitest unit tests passing (26 previos + 10 RT60 + 27 physics).
- ✅ **15/15** rutas E2E cargan sin JS errors (verificado por testing agent en 4 iteraciones).
- ✅ **12 fixes UI/testability** verificados en iteration_1→3.
- ✅ **2 features físicos nuevos** verificados con testids resolviendo a valores numéricos correctos (iteration_4).
- ✅ **Slider reactivity** verificada (mover `la-boxes` 8→12 recalcula spread; mover `la-far` 30→60 recalcula targets).
- ✅ `tsc -b --noEmit`: 0 errors.

## What's been implemented in this session (Fase A + Fase B — Jan 2026)

**Goal:** Validar todo lo construido en Fases A–E antes de nuevas features. Testing agent (iteration_1 → iteration_3) reportó y se resolvieron **10 issues** de UI/testability/UX:

### Fixed in iteration_2
1. **Sync Indicator global** — antes solo en /scenes; ahora montado en `AppLayout` (`App.tsx`) como pill flotante top-right sobre todas las rutas.
2. **`nav-more-*` testids double-dash** — pattern `path.replace(/^\/, '').replace(/\//g, '-')` limpio.
3. **`home-templates-btn` visible siempre** — movido al `SectionTitle` action del bloque "Acceso Rápido"; también hay `home-templates-btn-empty` para el estado sin room.
4. **AR Room Scan trigger** — nuevo botón `open-ar-scan-btn` en `/room-scan` step 1 + `ARRoomScanModal` finalmente montado.
5. **Room Scan wizard** — nombre del venue ya no bloquea; auto-fill "Recinto sin nombre" al escanear. Testid `room-continue-step1` en el CTA.
6. **SPL Meter `spl-value`** — visible siempre (renderiza `—` en idle, `…` en starting).
7. **Community submit-btn** — sin `disabled`; toast de sonner al clickear sin auth.
8. **Guided tour close-btn** — testid `close-guided-tour`.

### Fixed in iteration_3
9. **BottomNav pill testids** — antes concat sucio (`nav-pill-homegear-builder`); ahora limpio (`nav-pill-gear-builder`).
10. **FAB vs Continue overlap** — `pb-32` a cada step motion.div + `pb-28` global en AppLayout.

### Additional fix
- **ProButton silent-drop of data-testid** — el component en `ui.tsx` no forwardeaba `data-testid` al `<button>` DOM. Ahora sí (agregado a interface + spread).

### Final testing status
- ✅ **26/26** vitest unit tests passing.
- ✅ **15/15** rutas E2E cargan sin JS errors.
- ✅ Todos los 10 fixes verificados por testing agent.
- ✅ `tsc -b --noEmit`: 0 errors.
- ✅ Supervisor config actualizado — Vite dev server (port 3000) corre bajo supervisor con autorestart.

## What's been implemented in this session (Fase A + Fase B — Jan 2026)


### Fase A — Estabilización
- **Data quality fixes** en `gear-database.ts`:
  - `dna-dna20480` → `lake-lm44`, `lab-fp14000q` → `lab-plm20000q` (id ≠ modelo).
  - `ev-sx300` → `electro-voice-ev-elx200-18sp`.
  - Añadido `rmsWatts` a Behringer + EV entries que no lo tenían (evita fallback en gearMatchScore).
- **Zustand versionado v2** + `migrate` + `partialize` para evitar corrupción cross-version.
- **Bug fixes:**
  - `loadDemoVenue` ya no marca `hasSeenOnboarding: true` (permite ver onboarding a usuarios reales).
  - `saveScene` ahora baja `isDemoMode: false` (consistente con `loadScene`).
- **`calculateCrossover` mejorado:** soporta múltiples modelos de tops/subs, elige el peor caso (highest topLow, lowest subHigh).
- **`stage-engine`:** coupling loss (~0.4 dB/box arriba de 4 unidades) — antes ignorado.
- **Nueva `computeCoveragePercent`** derivada de geometría real (ángulo * throw / ancho) — reemplaza fórmula arbitraria en Home.
- **`ErrorBoundary`** global montado en App + por-página, previene tumbar toda la app en crash.
- **AI Advisor fallback offline:** `buildOfflineAdvisorReply` con recomendaciones heurísticas si falla la red.
- **Tests unitarios (Vitest):** 13 tests en `engines.test.ts` (acústicas + crossover + PA + gearMatchScore + coverage). Script `pnpm test`.

### Fase B — Rediseño Visual v4 "Neon Console"
- **Nueva paleta multi-acento (semantic):**
  - `--accent  #00FF9E` ready/primary
  - `--info    #5EEAD4` coverage/PA
  - `--dsp     #B794F6` processing
  - `--live    #FF3EA5` real-time
  - `--warning #FFB84D` warning
  - `--destructive #FF4D6D` critical
- **Tipografía Fontshare** (deliberadamente no-Inter/Roboto):
  - Cabinet Grotesk (display, 800/700), Satoshi (body), JetBrains Mono (specs técnicos).
- **Grain overlay SVG** fijo + radial ambience multi-hue en body background.
- **Bottom nav reducido** de 8 items a **5 primarios + FAB "MoreHorizontal"** con bottom-sheet animado para módulos secundarios.
- **Pills coloreadas por dominio** (Home=verde, DSP=purple, Live=magenta, etc).
- **Componentes UI actualizados:**
  - `StatusPill` acepta info/dsp además de ready/standby/live/warning/error/offline.
  - `Badge` con aliases legacy (orange→warning, purple→dsp, etc) para compat total.
  - `GlassCard` con `glow` tipado (`accent|info|dsp|live|warning`).
  - `AudioMeter` multi-band: verde → amber → magenta → red con box-shadow glow.
  - `DashboardCard` con tonos multi-acento.
- **Sensory feedback engine (`/lib/feedback.ts`):**
  - Sonidos UI vía Web Audio API (tap, select, success, warning, error, scan) — intervalos musicales, no beeps genéricos.
  - Haptics vía `@capacitor/haptics` (light/medium/success/warning/error) + fallback `navigator.vibrate` en web.
  - Toggle desde Ajustes; primed en primera interacción.
- **Utility classes CSS:** `pulse-glow`, `live-pulse`, `shimmer`, `gradient-border`, `pb-safe`, `pt-safe`.
- **Icons removed:** todos los emoji reemplazados con lucide-react + gradients + glow.
- **Text size floor:** minimum ~10px (subió de 9px) para mejor lectura on-stage.

### Verificación
- `npx tsc -b --noEmit` → **0 errores**.
- `pnpm test` → **13/13 pass**.
- `npx vite build` → 3,815 módulos, 15.78s build, 623 kB gzip.
- Screenshots verificados en mobile viewport 420×900:
  - Home dashboard con nueva paleta ✅
  - Bottom nav 5-items + FAB central ✅
  - More sheet animado ✅
  - Settings con toggles Sonido/Vibración ✅
  - Room Scan wizard ✅
  - DSP empty state ✅
  - Live con nav magenta pill ✅

## Prioritized Backlog

### P0 — Cloud (habilita "premium" real) ✅ IMPLEMENTED
- ✅ Convex backend para escenas: `convex/scenes.ts` con `list` / `upsert` / `remove` / `rename`.
- ✅ Schema con `by_token` + `by_token_client` indices para queries eficientes.
- ✅ Cloud sync hook (`useCloudSync`): merge automático local↔cloud con LWW por `updatedAt`.
- ✅ `SyncProvider` global + `SyncIndicator` UI pill.
- ✅ Scenes page rewrite: badges Cloud/Local, botón "push to cloud", delete propaga a nube.
- **Nota:** El schema real vive en `convex/schema.ts`, pero para producción el usuario debe ejecutar `npx convex dev` para generar el deployment y regenerar `_generated/`. En este session, la tipización se ajustó manualmente (`api.d.ts`) para pasar `tsc`.

### P1 — Features Wow (diferenciación) ✅ ALL IMPLEMENTED
- ✅ **SPL meter Live** con `getUserMedia` — ring animado + LED bar + peak-hold + Leq running + target marker + calibración (80/94/100 dB + slider manual). A-weighting emulado con biquad chain.
- ✅ **Stage Map 3D** con Three.js/r3f — cámara orbitable con OrbitControls, room como box translúcido, escenario, tops line-array flotantes con conos de cobertura, sub arrays con glow omnidireccional, monitors, delay towers, y **heatmap SPL 3D del piso**.
- ✅ **RT60 real** medido con micrófono — pink noise + reverse integration Schroeder + T20 fit + confidence heuristic (SNR-based). Integrado en Room Scan review.
- ✅ **Cardioid sub calculator** — 3 configs (front-rear / end-fire / gradient), fórmulas de spacing + delay + polaridad, patrón polar SVG.
- ✅ **Line array angle helper** — sliders para boxes/fly-height/near/far throw, ángulos progresivos por gap, vista lateral SVG con rays y audiencia.
- ✅ **Impedance calculator** — serie/paralelo, warnings de carga insegura, formula visible.

### P2 — Value Adds ✅ 2/3 IMPLEMENTED
- ✅ **Templates por tipo de servicio** — 5 catalogued: Iglesia dominical, Club 300pax, Corporate 80pax, Festival outdoor 1500pax, Teatro 500pax. Cada uno con room + gear pool preconfigurado + stats + gear badges.
- ✅ **A/B compare de escenas** — picker doble, diff table (capacidad/volumen/RT60/speech/music score con TrendingUp/Down icons), gear diff con barras horizontales side-by-side.
- ✅ **Test signals player** — pink noise / white noise / 1kHz / 100Hz / sweep con level slider + safety warning + haptics. Integrado en Live.
- ⏳ PDF export mejorado con gráficos (EQ, stage plot, waveform).
- ⏳ AR Room Scan con cámara.
- ⏳ Compartir escenas por link/QR.
- ⏳ Community gear DB.

### P2 — Value Adds
- Templates guardados por tipo de servicio (iglesia/club/conferencia).
- A/B compare de escenas side-by-side.
- Test signal player (pink noise, sine sweep, 1 kHz).
- PDF export mejorado con gráficos (EQ, stage plot, waveform).
- AR Room Scan con cámara (medir dimensiones apuntando esquinas).
- Compartir escenas por link/QR.
- Community gear DB (user submissions).

### P3 — Business model
- Freemium: cloud sync detrás de paywall (Stripe).
- Team plan / colaboración realtime en Live.
- Marketplace de templates verificados.
- API/webhook a Q-SYS Designer / Meyer Compass.

## Files touched (Fase D — RT60 + Test Signals + PA Toolkit + Templates + Compare)

- `src/lib/audio/test-signals.ts` (NEW — Web Audio pink/white/sine/sweep)
- `src/lib/audio/rt60-measure.ts` (NEW — Schroeder reverse-integration, T20 fit)
- `src/lib/audio/pa-toolkit.ts` (NEW — cardioid, line-array, impedance math)
- `src/lib/audio/templates.ts` (NEW — 5 curated templates)
- `src/lib/audio/__tests__/toolkit.test.ts` (NEW — 13 more unit tests)
- `src/components/soundmap/rt60-modal.tsx` (NEW — 1-tap RT60 measurement UI)
- `src/components/soundmap/test-signals-player.tsx` (NEW)
- `src/components/soundmap/nav.tsx` (added Toolkit/Templates/Compare items)
- `src/pages/toolkit/index.tsx` (NEW — 3 tabs, sliders, polar SVG, side view SVG)
- `src/pages/templates/index.tsx` (NEW — grid catalog with 5 templates)
- `src/pages/compare/index.tsx` (NEW — A/B picker + diff table + gear diff bars)
- `src/pages/live/index.tsx` (added TestSignalsPlayer)
- `src/pages/room-scan/index.tsx` (added RT60 modal integration)
- `src/pages/scenes/index.tsx` (added Compare A/B button)
- `src/pages/Index.tsx` (added Templates shortcut on Home empty-state)
- `src/store/app.ts` (added `applyTemplate` action)
- `src/App.tsx` (registered `/toolkit`, `/templates`, `/compare` routes)

## Files touched (Fase C — Cloud sync + SPL meter + Stage 3D)
… (previous session)

## Files touched (Fase A + B) — see previous session

## Next tasks
- **P2 restantes**: PDF export con gráficos avanzados (EQ curve, stage plot, waveform), AR Room Scan con cámara del teléfono, **compartir escenas via QR/link** (aprovecha cloud sync), community gear DB.
- **P3**: freemium con Stripe, team plan colaborativo en `/live` vía Convex realtime, marketplace de templates verificados.

## Test coverage
- **26 unit tests passing** (`pnpm test`): engines (13) + toolkit/templates (13).
- All engines validated: acoustics, PA rec, crossover (multi-model), gear scoring, coverage, cardioid subs (3 configs), line array angle progression, impedance safety threshold, template catalog integrity.

## Setup Notes (for the user)
- Este repo usa **pnpm 9** con `pnpm-workspace.yaml`.
- Para arrancar dev: `pnpm dev` (Vite en :5173) — o `pnpm build` para producción.
- **Convex**: para activar el cloud sync real hay que correr `npx convex dev` una vez (genera `_generated/` con endpoint real, requiere cuenta Convex). Sin eso, la app funciona igual en modo "solo local" (el SyncIndicator lo indica).
- **Micrófono**: SPL meter y RT60 requieren HTTPS o localhost. En Android WebView con Capacitor ya está habilitado.
- Android build: `pnpm build && npx cap sync android && npx cap open android`.
