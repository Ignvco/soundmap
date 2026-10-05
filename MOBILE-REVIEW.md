# Revisión móvil del diseño final

Actualización sobre `codex/soundmap-v6-3d`, basada en las dos referencias visuales aprobadas por el usuario. Se conservan los motores, las escenas guardadas y el contrato de posiciones/alturas entre plano, 3D y cobertura.

## Cambios

- Cabecera móvil compacta, navegación inferior de cinco accesos y menú de herramientas. Sidebar desde 1024 px; búsqueda accesible también en escritorio.
- Home con dos métricas principales, escenario y métricas secundarias. Formularios de Design en una columna, pasos compactos y acciones inferiores sin duplicación en Recinto.
- PA con filas de equipo, cantidad y detalles desplegables; DSP con EQ como vista inicial; Patch con resumen compacto; Guardar presenta primero el nombre y la acción.
- Perform da prioridad al medidor real y coloca la respuesta estimada del PA en su propio panel. Scenes usa filas y una vista previa en panel. Compare conserva dos vistas simultáneas y una escala SPL común.
- Stage Map concentra controles y deja la evaluación desplegable. Escaneo AR ocupa la pantalla móvil; su modo manual muestra directamente las dimensiones.
- Ajustes, análisis, AI Advisor y Kiosk adaptan columnas, controles y desplazamiento al ancho disponible.
- Márgenes de barras del sistema conectados a las variables de Capacitor, fondo oscuro y `adjustResize` para el teclado Android. Sin dependencias nuevas.

## Validación realizada

- Suite completa: 256 pruebas aprobadas en 14 archivos, incluidas persistencia, coordenadas/alturas y geometría AR.
- TypeScript y compilación de producción con `pnpm build`: correctos.
- `pnpm exec cap sync android`: copia de assets y sincronización de plugins correctas.
- ESLint de los archivos TypeScript modificados y `git diff --check`: correctos.
- Revisión de vistas en navegador con anchos de 360, 390, 430, 768 y 1024 px. Las pantallas inspeccionadas no desbordaron horizontalmente; los paneles con desplazamiento propio conservan su comportamiento.
- PA: aumentar y reducir cantidad de SRX906LA (4 → 5 → 4), y abrir detalles.
- Guardar y cargar escenas, abrir su vista previa y comparar dos escenas guardadas.
- Stage Map: editar altura a 3,5 m y posición a 5 m desde la izquierda; valores conservados al recargar.
- AR manual: aplicar 25 × 16 × 5 m al formulario; cierre y navegación al menú de herramientas correctos.
- Inspección visual de Home, pasos de Design, Perform, Scenes, Compare, Stage Map, análisis y ajustes. Se retiró la página temporal usada para revisar tamaños.

## Alcance de la revisión

El navegador de revisión tiene WebGL deshabilitado. Se verificaron los contenedores, datos y estados alternativos; el render 3D, la órbita y su rendimiento requieren validación física. Tampoco se acreditan cámara trasera, orientación, micrófono, teclado virtual ni barras del sistema en un teléfono real. Esta actualización no genera un APK firmado.

Vite mantiene el aviso del chunk 3D de aproximadamente 943 kB (256 kB gzip), cargado de forma diferida.

La configuración del teclado sigue la [documentación de Android](https://developer.android.com/develop/ui/views/layout/sw-keyboard); la integración de márgenes se contrastó con el código de Capacitor 8 instalado en el proyecto.
