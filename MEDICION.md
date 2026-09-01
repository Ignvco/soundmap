# Medición y cumplimiento — el hallazgo más delicado

Estado: `tsc` limpio · **155 tests** · `eslint` 0 errores · build OK.

---

## 🔴 "Compliance: 100%" no medía compliance

El Perform Hub mostraba una tarjeta grande que decía **Compliance — 100%**.

El código detrás era este:

```
{pa && pa.headroomDb >= 3 ? "100" : "—"}
```

O sea: *"si al sistema le sobran 3 dB de headroom, cumplimiento 100%"*.

Headroom es margen de SPL del sistema. El cumplimiento de la directiva
**2003/10/EC** es exposición del trabajador: `LEX,8h`, nivel equivalente
normalizado a una jornada de 8 horas, con umbrales de acción en 80, 85 y 87
dB(A). **No tienen absolutamente nada que ver.** Un sistema con 12 dB de
headroom puede estar destrozando oídos, y uno con 2 dB puede estar perfecto.

Y justo debajo había un enlace que ofrecía *"PDF · CSV EU 2003/10/EC"*.

Un ingeniero podría haber mostrado esa pantalla a un productor o a un
inspector municipal como evidencia de cumplimiento. No lo es.

**Arreglado**: la tarjeta ahora dice **Headroom** y muestra los dB reales con
signo (`+6 dB`, `−4 dB`) contra el objetivo de 105 dB SPL. Que es exactamente lo
que calcula. Saqué también las menciones a la directiva de los enlaces de
exportación del diseño.

---

## El motor correcto existía y nadie lo usaba

Lo raro del caso: `lib/audio/session-recorder.ts` **implementa bien** la
directiva. `LEX = Leq + 10·log10(T/8h)`, umbrales 80/85/87. Está correcto.

Sólo lo usaba el `SPLMeter`. La tarjeta del Perform Hub, que era la que gritaba
"Compliance 100%", no lo tocaba.

---

## 🟠 El veredicto normativo salía de un micrófono sin calibrar

El panel de resumen de sesión sí usa el motor bueno: muestra `LEX,8h` y un
veredicto **EU 2003/10/EC** con su etiqueta.

El problema es de dónde viene el número. El offset de calibración arranca en
100 dB — **un valor por defecto arbitrario, no una medición**. Y el hook no
distinguía "sin calibrar" de "calibrado y dio justo 100".

Un teléfono sin calibrar puede estar corrido varios dB. Los umbrales de la
directiva están separados por 5 y 2 dB. Es perfectamente posible cruzar de
"seguro" a "supera el valor límite" por puro error de capsula.

**Arreglado**:

- El hook ahora expone `isCalibrated`, que sólo se pone en `true` cuando el
  usuario calibra contra una referencia o ajusta el offset a mano.
- Si no se calibró, el panel de exposición muestra una advertencia junto al
  veredicto: *"El nivel absoluto no es trazable: usalo como referencia, no como
  documentación."*
- **Los archivos exportados llevan cabecera de procedencia.** Esto era lo más
  importante: la advertencia en pantalla desaparece en cuanto el CSV sale de la
  app, y el CSV es justamente lo que termina en manos de un tercero. Ahora el
  archivo declara el offset usado y si hubo calibración.

Corrijo algo que dije la vuelta pasada: afirmé que "no hay UI de calibración".
**Me equivoqué** — sí la hay, en los ajustes del medidor, con calibración contra
un valor objetivo. Lo que faltaba no era el control, era que el resto de la app
supiera si se había usado.

---

## Lo que sigue siendo cierto y conviene que tengas presente

Aun calibrado, **un teléfono no es un sonómetro Clase 1 ni Clase 2**. El
ponderado A es una aproximación por biquads, no un filtro certificado, y la
respuesta del micrófono no es plana. Para documentación formal hace falta un
equipo homologado. La app ahora lo dice en los archivos exportados.

Para lo que sí sirve, que no es poco: tendencias, comparar salas, ver cuánto
tiempo estuviste sobre 90 dB, detectar que un tema se te fue de nivel.

---

## Sin verificar

**No abrí la app en un navegador.** El panel de resumen de sesión sólo aparece
al terminar una medición con el micrófono activo — es de los flujos más difíciles
de alcanzar y no lo vi renderizado nunca.
