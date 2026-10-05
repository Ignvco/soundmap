# Pantalla DSP y datos de entorno

Estado: `tsc` limpio · **157 tests** · `eslint` 0 errores · build OK.

Esta pantalla es de donde el operador copia números **a mano** a un DCX2496,
un Driverack o un Galileo. Un error acá no queda en la app: sale por los
parlantes.

---

## 🔴 Decía Butterworth, el motor calculaba Linkwitz-Riley

La ficha de cada salida mostraba:

> Filtro Paso Alto — 80 Hz · **24dB/oct Butterworth**

Pero `calculateCrossover` devuelve `slope: "LR24"` — Linkwitz-Riley 24. La
etiqueta estaba escrita a mano en la vista y nunca leyó lo que el motor decidió.

No son intercambiables. Dos Butterworth de 24 dB/oct sumados en el cruce dan
**+3 dB**; dos Linkwitz-Riley suman plano. Un operador que copie "Butterworth"
a su procesador se lleva un bump en el cruce que ningún cálculo de la app
previó — ni el SPL, ni el headroom, ni la respuesta que la propia app dibuja.

**Arreglado**: la etiqueta ahora deriva del `slope` del plan de cruce.

---

## 🔴 La quinta copia de la velocidad del sonido

El tab de Delay convertía milisegundos a metros con `out.delayMs * 0.343`.

Ese `0.343` es 343 m/s a 20 °C, fijo. Pero el delay que estaba **al lado**, en
números grandes, ya lo calcula el motor usando la temperatura de la sala. A
35 °C la distancia mostrada no se correspondía con el delay mostrado, en la misma
tarjeta.

Es la quinta vez que aparece este patrón: la vista reimplementa física que el
motor ya resolvió. Antes fueron cuatro copias distintas de la ganancia de array
y dos de la velocidad del sonido.

**Arreglado**, y con dos tests de guardarraíl que dejan constancia de por qué la
vista no puede hardcodear la constante.

---

## 🟠 Lo que descubrí de paso: el formulario nunca pedía temperatura

Al cablear la temperatura me di cuenta de algo incómodo: **todo mi trabajo de
temperatura de las vueltas anteriores estaba inerte.**

`RoomScanInput` acepta `temperature` y `humidity`. El motor de acústica los usa
para la absorción del aire (ISO 9613-1). La alineación temporal los usa desde
que la arreglé. Pero el formulario de escaneo **nunca los pedía**, así que
`room.temperature` era siempre `undefined` y todo caía al default de 20 °C.

**Agregado** al paso de materiales: temperatura (−10 a 50 °C) y humedad
(0–100 %), con una nota que explica por qué importan.

Para tu caso concreto esto no es cosmético. Una iglesia climatizada a 20 °C y un
show al aire libre en Mendoza en enero a 35 °C no son el mismo problema
acústico: cambia la absorción de agudos en el aire y cambian todos los tiempos
de alineación un 2.6 %. En una torre de delay a 100 m son unos 7 ms — audibles.

---

## Cómo se ve el patrón completo

Cinco vueltas, el mismo hallazgo con distinta ropa:

| Dónde | Qué afirmaba | Qué era |
|---|---|---|
| system-vitals | SPL con `20·log10` | 6 dB inflado vs el motor |
| Kiosk | "PANIC MUTE" | No mutea nada |
| Perform Hub | "Compliance 100%" | Headroom ≥ 3 dB |
| Medidor | Veredicto EU 2003/10/EC | Micrófono sin calibrar |
| DSP | "Butterworth" | Linkwitz-Riley |

No es descuido de una persona: es lo que pasa cuando la capa de presentación
puede inventar sus propios números sin que nada la contradiga. Por eso los
tests que agregué apuntan a la **consistencia entre motor y vista**, no sólo a
la corrección de cada fórmula por separado.

---

## Sin verificar

**Sigo sin haber abierto la app en un navegador.** Los campos nuevos de
temperatura y humedad son UI que escribí a ciegas, dentro de un formulario de
varios pasos. Es de lo más probable que necesite ajuste visual.

Andá a Diseño → Recinto → paso de materiales y fijate que la tarjeta "Ambiente"
entre bien en el ancho del teléfono.
