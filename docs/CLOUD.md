# Backend opcional

La aplicación local no requiere cuenta. Para habilitar colaboración/asesor:

1. Crear un despliegue Convex propio y un cliente OIDC público tipo SPA con
   Authorization Code + PKCE (S256). Configurar callback exacto
   `https://TU_ORIGEN/auth/callback` y los orígenes permitidos del proveedor.
2. Configurar `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`, `VITE_OIDC_ISSUER`,
   `VITE_OIDC_CLIENT_ID` y, si el proveedor lo exige, `VITE_OIDC_AUDIENCE`.
3. Configurar **solo en Convex** `AUTH_ISSUER`, `AUTH_AUDIENCE`,
   `ALLOWED_ORIGINS` (separados por coma, sin wildcard), `ANTHROPIC_API_KEY`,
   `ADVISOR_MODEL` y `MODERATOR_IDS` (tokenIdentifier exactos separados por coma).
4. Ejecutar la generación/despliegue de Convex en ese entorno autorizado. La
   entrega contiene generación local desde templates oficiales del paquete,
   comprobación TypeScript y pruebas `convex-test`; no desplegó un servicio.

El proveedor debe emitir access tokens JWT con issuer/audience aceptados por
Convex. Un proveedor que entrega tokens opacos requiere configurar su API/audience;
no usar ID tokens arbitrariamente ni introducir un client secret en el frontend.
Los access tokens se mantienen en memoria. El estado temporal de PKCE utiliza
sessionStorage; recargar puede requerir reconectar la cuenta. Desconectar elimina
la sesión local, no cierra la sesión SSO global del proveedor.

Los espacios tienen owner/editor/viewer. El propietario concede acceso por
identificador de cuenta; no se envían invitaciones ni correos. Publicar requiere
una revisión local guardada. Hay atribución, inmutabilidad, idempotencia por ID y
comparación de revisión esperada para rechazar conflictos. Datos superiores a
700 kB UTF-8 se comparten mediante archivo. La consulta muestra 30 revisiones
recientes por página/consulta; conservar backups para archivo completo.

El catálogo compartido requiere fuente HTTPS, autoría y nota de moderación.
Una aprobación documental no afirma ensayo físico. El catálogo local es independiente.
El asesor exige identidad y origen autorizado, limita cuerpo a 32 KiB, contexto,
mensajes, salida y duración. Cuotas: 3/minuto y 30/día por identidad, 1000/día
globales, con actualización transaccional y limpieza de entradas vencidas.
El coste total depende del modelo/tokens; configurar también límites del proveedor.

## Aceptación del despliegue

- Dos cuentas reales: propietario/editor/lector y cuenta sin acceso; revocar
  membresía y verificar rechazo inmediato de consultas y publicación.
- JWT vencido/issuer/audience incorrectos, callback fallido, reconexión y logout.
- CORS permitido/rechazado, OPTIONS, cuerpos grandes, roles inválidos, límite de
  cuota y cancelación durante stream. No se exponen errores ni claves del proveedor.
- Publicación concurrente: conservar revisión existente y devolver conflicto;
  reintento idéntico idempotente. Propuestas de catálogo solo moderables por cuentas autorizadas.

Estos ensayos con proveedor/deployment real quedan pendientes de ejecución.
