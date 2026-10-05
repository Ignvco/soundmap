# Matriz de implementación — SoundMap 6.1

Base: `bbf461aaeb1860f18619f51759b667463cc33d47` de `codex/soundmap-v6-3d`.
Integración local: `patch/auditoria-integral-v6`. Se entrega mediante patches;
no se modificaron ramas remotas ni se desplegaron servicios.

«Implementado» describe código y verificaciones locales. No equivale a
aceptación física o certificación profesional. Toda la auditoría queda mapeada;
las condiciones externas o datos aún no revisados se explicitan, no se cierran ficticiamente.

| Hallazgo                | Implementación                                                                                                            | Evidencia / condición restante                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| P0-01 Protección        | Referencias W/Ω/Vrms/dBu/dBFS; rutas y canal exigidos; sin umbral accionable incompleto                                   | Pruebas eléctricas sintéticas. Verificar cadena real; solo seis fichas con correcciones parciales               |
| P0-02 Motor común       | Receptor/objetivo y campo directo compartidos; bandas y ausencia de fuentes                                               | Regresiones de SPL, cobertura, ganancia y reporte                                                               |
| P0-03 Captura           | Offset aplicado en ejecución; A digital, FAST y Leq por muestras; perfil por dispositivo                                  | Referencia sintética 94 dB sin reinicio; no certifica precisión del micrófono                                   |
| P0-04 RT                | Absorción según ocupación; ajuste temporal independiente; T20/T30/EDT separados                                           | Casos numéricos, ruido medido, saturación y rechazo explícitos; contraste físico pendiente                      |
| P0-05 Operación         | Apagado corregido, bypass condicionado, end-fire frontal                                                                  | Pruebas de suma frontal/trasera; revisión de ingeniero en sistema real pendiente                                |
| P0-06 PDF               | DTO compartido, Unicode, fuentes locales, posiciones físicas y límites                                                    | Cuatro inventarios exportables, páginas inspeccionadas, sin NaN/Infinity                                        |
| P0-07 Guardado          | Borrador separado; guardar/cargar/duplicar revisión completa                                                              | Regresión de edición de recinto/layout y hash de entradas                                                       |
| P0-08 Asesor            | Auth, autorización, CORS explícito, cuerpo acotado, cuota, timeout, cancelación                                           | Pruebas de endpoint y permisos; despliegue y proveedor real pendientes                                          |
| P1-01 Catálogo          | Procedencia y campos revisados; potencia estructurada; desconocidos identificados                                         | Correcciones JBL SRX906LA, L-Acoustics K2, QSC KLA12/KLA181/K10.2 y Crown XLS2502. Resto pendiente de contraste |
| P1-02 Evaluador         | Contrato versionado y caché acotada; vistas y reporte comunes                                                             | Pruebas de mismo receptor/layout/DSP y ausencia de sistema                                                      |
| P1-03 Evidencia         | AudioWorklet para nivel/decaimiento, exclusión de capturas, perfiles, curvas, interrupciones                              | Pruebas de reloj, Leq, cancelación tardía y persistencia; ensayo metrológico pendiente                          |
| P1-04 DSP/patch         | Salidas/EQ editables, comparación/aceptación de propuesta, rutas, entradas, verificación declarada                        | No hay metros/GR simulados; no se comunica con un DSP físico                                                    |
| P1-05 Simulación        | Posición/orientación compartida; filtros; modo coherente ideal explícito; reflexiones con fuente/receptor/materiales      | No usa polares/fase medida ni acoplamiento completo de line array; alcance en PHYSICS.md                        |
| P1-06 Optimizador       | Candidatos sobre IDs/cantidades existentes, techo/grupos/exclusiones; aplicar y deshacer                                  | Prueba de restricciones/cancelación y mismo evaluador; rigging físico fuera del modelo                          |
| P1-07 Flujo             | Recinto → PA → DSP → ruteo → medición → hallazgos → informe                                                               | Revisiones con evidencia/motivo y reapertura tras cambios                                                       |
| P1-08 Offline           | Caché de release completo y fuentes, IndexedDB, restauración transaccional y deshacer                                     | Primera visita offline a cinco rutas; actualización bloqueada durante captura o fallo de guardado               |
| P1-09 Móvil             | Áreas táctiles, foco, pasos desplazables y corrección de desbordamientos                                                  | 21 rutas en 320/390/1440 px; Android físico/TalkBack pendientes                                                 |
| P1-10 Informe           | Paginación clara, Unicode, conclusión, autoría, procedencia, evidencia, hash                                              | Revisión visual de todas las páginas de cuatro variantes; salida compartida JSON/Markdown                       |
| P1-11 Importaciones     | Esquemas profundos, tamaño/nesting/cantidades, descompresión acotada, rechazo previo a escritura                          | Pruebas de backup inválido y undo; cálculos importados se recomputan                                            |
| P1-12 Dependencias      | pnpm único; árbol actualizado y overrides de transitorias                                                                 | `pnpm audit`: cero vulnerabilidades al verificar; debe repetirse en cada release                                |
| P1-13 QA                | Regresiones del dominio, Convex, captura y navegador; CI y presupuestos                                                   | 265 pruebas; pruebas físicas separadas en FIELD_VALIDATION.md                                                   |
| P1-14 Asesor            | Preflight, cancelación, sesión real opcional y origen local/remoto visible                                                | Rechazo de origen/usuario; prueba E2E con proveedor real pendiente                                              |
| P2-01 Componentes       | Campos y estados de auditoría reutilizados; estilos y semántica comunes                                                   | Integración visual sobre el diseño existente                                                                    |
| P2-02 Lectura           | Fuentes offline, labels principales en español y métricas identificadas                                                   | Algunos términos de equipo (DSP/FOH/delay) se mantienen por uso técnico                                         |
| P2-03 Arquitectura      | Servicios de captura/persistencia/evaluación/reporte; DSP por editor; páginas recinto/plano/comparación separadas; 3D TSX | TypeScript de app y backend, lint sin errores                                                                   |
| P2-04 Rendimiento       | Miniatura SVG, 3D explícito, lazy routes, caché acotada, límites de unidades                                              | Presupuestos: entry ≤350 KiB gzip, release offline ≤12 MiB. Benchmark de Android físico pendiente               |
| P2-05 Estados heredados | Sin usuarios/votos seed ficticios; auth/sync no simulan éxito; catálogo local identificado                                | Comunidad real opcional en Colaboración; requiere deployment                                                    |
| P2-06 Entrega           | Versión 6.1.0, pnpm 11.25.0, lockfile único, changelog, CI, base/serie identificadas                                      | Sin push, merge ni despliegue automático                                                                        |
| P3-01 Geometría         | Polígonos simples JSON, balcones, exclusiones y superficies por bandas                                                    | Sin oclusión/difracción de balcones; ejemplo y límites documentados                                             |
| P3-02 3D                | Cotas reales de modelos documentados, orientación, receptor y plano de muestreo correctos                                 | Modelos geométricos esquemáticos; no se incluyen activos fotorealistas licenciados                              |
| P3-03 Colaboración      | OIDC/PKCE, roles, revisiones inmutables/conflictos, catálogo con autoría/moderación                                       | Backend probado localmente; identidad, reglas y despliegue reales pendientes                                    |
| P3-04 Contexto          | Atajos, paso recordado, cámara guardada/restaurada, vistas ortográficas                                                   | Validación de ergonomía en terreno pendiente                                                                    |

## Comprobaciones ejecutadas

- 265 pruebas de dominio, almacenamiento y backend en 19 archivos.
- TypeScript de aplicación y Convex; build de producción; lint sin errores.
- 63 recorridos de pantalla (21 rutas × tres anchuras), sin desbordamiento horizontal
  ni errores de página; capturas conservadas en el paquete de evidencias.
- Captura sintética: calibración a 94 dB sin reinicio, sesión/interrupción persistidas
  y detención de un stream concedido después de cancelar su permiso.
- Interacción: guardar/recuperar cámara, cuatro vistas, altura numérica, aplicar/deshacer optimización y guardar revisión.
- Tamaño medido: entrada 293.527 bytes gzip; release 4.869.706 bytes.
- Primera navegación offline a toolkit, expediente, DSP, informe y 3D.
- PDF: demo con DSP/hallazgo, solo tops, solo subs y recinto sin altavoces.
- Auditoría de dependencias de producción y desarrollo, sin avisos al verificar.

Se ejecutaron los recorridos de interfaz y PDF, y el recorrido offline en procesos
separados por una limitación del Chromium del entorno al crear varios contextos.
La prueba versionada reutiliza el contexto para permitir la ejecución completa.
La CI se entrega configurada; no se afirma que haya corrido en GitHub.
