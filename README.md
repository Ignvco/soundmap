# SoundMap 6.1

Auditoría de recintos y sistemas de sonido: inventario por unidad física, plano,
plan DSP editable, rutas, evidencias y revisiones locales. Los resultados del
motor son estimaciones de campo directo, no mediciones ni certificaciones.

## Desarrollo

Node >=22.16, pnpm **11.25.0**. El lockfile canónico es `pnpm-lock.yaml`.

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev
```

La aplicación funciona sin cuenta. La nube y el asesor remoto son opcionales;
las variables se describen en `.env.example` y `docs/CLOUD.md`.

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm check:bundle
pnpm exec playwright install --with-deps chromium
pnpm test:browser
pnpm audit
```

`test:browser` inicia servidores en los puertos 5173 y 4173. Genera capturas,
cuatro PDF y un registro JSON en `test-results/`. `CHROME_BIN` permite usar un
Chromium instalado; `CHROME_ARGS` admite argumentos JSON para entornos de CI.

## Trabajo en terreno

1. Define recinto, receptor, objetivo y ocupación.
2. Registra cantidades; coloca cada caja en el plano.
3. Revisa y acepta una propuesta DSP; edita salidas, EQ y rutas físicas.
4. Documenta la cadena eléctrica antes de calcular un techo RMS.
5. Captura nivel o decaimiento. El perfil se vincula al micrófono y sample rate.
6. Registra hallazgos, acciones y evidencia de cada revisión.
7. Guarda una revisión completa; exporta PDF y JSON de la misma instantánea.

Un cambio relevante reabre las revisiones afectadas. Las escenas guardadas no
se modifican al mover equipos en el borrador. El backup incluye configuraciones,
perfiles, escenas y curvas; la última importación se puede deshacer en Ajustes.

Ctrl/⌘+S guarda revisión. Alt+Mayús+A/D/M/S/E abre expediente/diseño/medición/plano/informe.
La cámara se guarda desde el visor. El asistente de auditoría recuerda su paso.

## Alcance y validación

- [Matriz de implementación de la auditoría](docs/AUDIT_IMPLEMENTATION.md)
- [Contrato físico y ejemplos de geometría](docs/PHYSICS.md)
- [Protocolo de validación física y Android](docs/FIELD_VALIDATION.md)
- [Configuración y pruebas del backend](docs/CLOUD.md)
- [Cambios de la versión](CHANGELOG.md)

El software no valida una suspensión ni configura equipos conectados. Los
presets son planes documentados. «Verificado» significa una declaración
acompañada de evidencia del técnico, nunca telemetría simulada.
