# Validaciones externas de aceptación

Estas comprobaciones requieren equipos/personas reales. No fueron ejecutadas por
la suite de software y deben registrarse por revisión, equipo, fecha y responsable.

## Cadena de medición

1. Registrar modelo/serie de micrófono, interfaz, ganancia, sistema/navegador,
   frecuencia de muestreo, calibrador y referencia con trazabilidad vigente.
2. Confirmar AGC, cancelación y supresión desactivados. Capturar antes y después
   contra la referencia; documentar deriva. Rechazar el perfil al cambiar cadena/ganancia.
3. Contrastar niveles por bandas, respuesta A, FAST, Leq y saturación frente al
   instrumento de referencia; definir tolerancias con el responsable metrológico.
4. Contrastar RT con un método/instrumento de referencia en varias posiciones,
   niveles y condiciones de fondo. Conservar curvas, rango, SNR, R² y rechazos.
5. Desconectar micrófono, bloquear pantalla, ocultar página, cancelar permisos
   tardíos y cerrar la app. Verificar interrupción registrada, recuperación y nueva sesión.

## Sistema y procedimientos

- Confirmar ratings, impedancia, cantidad por canal, ganancia real de etapa,
  dBu full scale, trim y preset; contrastar conversión eléctrica con carga adecuada.
- Revisión de ingeniero de audio del encendido/apagado, bypass condicionado y
  ajuste end-fire, verificando suma frontal/trasera en el sistema real.
- Comparar predicción con medición y software del fabricante en receptores y
  bandas representativos, documentando diferencias de line array y reflexiones.
- Contrastar cada modelo que se vaya a usar. Solo seis entradas tienen correcciones
  parciales documentadas en esta entrega; otros campos/modelos siguen sin revisar.

## Android y accesibilidad

Probar al menos un Android físico de gama media con Chrome y el APK de Capacitor:
inventario con teclado, incremento/decremento, ubicación por números y arrastre,
revisión DSP, captura continua, pantalla bloqueada, rotación, notches/teclado virtual,
exportación/compartir PDF, almacenamiento lleno y retorno tras cierre forzado.
Hacer una sesión de trabajo completa offline después de confirmar descarga.
Verificar foco visible y orden con teclado/TalkBack; tareas de una mano a 320/390 px.
Registrar modelo, SO, tiempos de arranque/cambio de ruta, memoria y batería.

La emulación de viewport del navegador no sustituye estas comprobaciones.
