# Cambios

## 6.1.0 — auditoría integral

- Corrige absorción por ocupación, headroom, bandas útiles, filtros LR24/RBJ,
  geometría por caja, orden de apagado y alineación end-fire.
- Añade expediente, revisiones completas, evidencia de revisión y reapertura
  automática tras cambios. DSP, EQ, rutas, canales y referencias eléctricas editables.
- Unifica campo directo, receptor, objetivo y procesamiento aceptado. Suma
  energética por defecto y suma coherente ideal explícita. Optimización aplicable y reversible.
- Sustituye el muestreo de UI por AudioWorklet: perfiles persistidos, Leq por
  muestras, FAST y máximo RMS identificados, interrupciones y curvas recuperables.
- Reconstruye el PDF con Unicode, páginas claras, posiciones reales, procedencia,
  conclusión, hash de entradas y el mismo DTO que la vista previa y el JSON.
- Migra a IndexedDB con backup transaccional, validación profunda y recuperación.
  Precarga todas las rutas y fuentes para trabajo offline; protege actualizaciones durante captura.
- Tipado 3D, vista inicial ligera, vistas ortográficas/cámara guardada, dimensiones
  de modelos documentados, polígonos/balcones importados y RT por bandas.
- Nube opcional: OIDC/PKCE, espacios privados, permisos, revisiones inmutables,
  conflicto de publicación, catálogo moderado, asesor autenticado con cuotas y cancelación.
- Actualiza dependencias y fija pnpm/versión; agrega CI, regresiones físicas,
  pruebas del backend, navegador y presupuesto de bundle.

No incluye despliegue, claves de terceros, validación metrológica, prueba en
Android físico ni contraste documental de todos los modelos heredados.
