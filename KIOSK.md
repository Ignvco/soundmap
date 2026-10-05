# Kiosk FOH — la pantalla que se usa durante el show

Me la salté de orden a propósito. `compare` tiene 30 estilos inline y `kiosk`
sólo 9, pero **kiosk es la única pantalla que se usa con el público adentro**.
Un error ahí cuesta distinto.

Y había uno grave.

---

## 🔴 El "PANIC MUTE" mentía

El encabezado del propio archivo lo decía:

> *"Virtual faders per DSP output (visual reference — does NOT drive real hardware)"*

Pero abajo había un botón de 56 px de alto, rojo, que decía **PANIC MUTE** en
mayúsculas, y al apretarlo levantaba un banner a pantalla completa, pulsante,
diciendo **MUTED**.

No mutea nada. No hay conexión con el DSP.

Pensá el escenario real: realimentación en pleno tema, o entra la pista
equivocada, o pasa algo en la sala. Estás con el teléfono en la mano, hay un
botón rojo enorme que dice PANIC MUTE. Lo apretás. La pantalla te confirma
MUTED. **Y el sistema sigue sonando igual.**

Un control de seguridad que miente es peor que no tenerlo, porque consume los
segundos en que habrías ido al mixer.

**Lo saqué.** En su lugar hay dos cosas honestas:

- Un aviso permanente en la barra inferior: *"Referencia visual — no controla el
  DSP"*. Fijo, siempre visible, en ámbar.
- Un botón **Marcar** que sí hace algo real: guarda el momento de la sesión con
  el SPL de ese instante. Las últimas tres quedan a la vista. Sirve para anotar
  el pico de un tema sin soltar el kiosk ni buscar papel.

Los faders siguen siendo interactivos: como referencia de la estructura de
ganancia son útiles. Lo que ya no hacen es fingir que son un control de
emergencia.

---

## Otros arreglos, con criterio de operador

**El color agrupaba por número de salida, no por rol.** `OUT-A` verde, `OUT-B`
verde más oscuro, `OUT-C` blanco, `OUT-D` turquesa… A un metro de distancia, en
la oscuridad, no querés distinguir OUT-C de OUT-D: querés distinguir **tops de
subs de monitores**. Ahora lime = tops, azul = subs, ámbar = cuñas.

**Los colores de nivel no significaban nada.** Eran los neones legacy que ya
había purgado del CSS. Ahora siguen los umbrales del propio medidor, que son
razonables: ámbar desde 92 dB(A) (entorno de límites de jornada), naranja desde
105 (daño rápido), rojo desde 120 (umbral de dolor). Documentado en el código
para que nadie los cambie por gusto estético.

**El cronómetro se reseteaba a cero al pausar el micrófono.** Si parabas el
medidor un momento, perdías el tiempo de sesión acumulado — que es justo el dato
con el que se estima exposición. Ahora acumula entre pausas.

**"Leq" a secas no dice nada.** Leq es siempre sobre una ventana. El hook lo
calcula desde que arrancó el medidor, así que ahora dice **"Leq sesión"**.

**El wake lock estaba siempre encendido**, incluso con el medidor parado: la
pantalla no se apagaba en toda la noche aunque no estuvieras midiendo. Ahora se
ata a que el medidor corra.

**Con más de 8 salidas, las extra desaparecían en silencio.** El rig grande es
justo donde más importa saber que falta algo. Ahora avisa cuántas quedaron fuera.

**El botón de pantalla completa está muerto en Android.** La Fullscreen API no
existe dentro del WebView de Capacitor: el botón se veía pero no hacía nada. Se
oculta donde no aplica.

**El estado vacío no ofrecía salida.** Decía "Cargá un recinto y equipo" y
listo. Ahora aclara que **el medidor de SPL funciona igual sin sistema cargado**
—que es lo que un operador necesita saber— y ofrece ir a Diseño.

---

## Lo que NO toqué, y por qué

**El medidor sigue sin calibración accesible desde el kiosk.** El hook tiene
`refOffset` (default 100 dB) y `setCalibrationOffset`, pero no hay UI para
ajustarlo. Sin calibrar contra una fuente conocida —un calibrador de 94 dB u
otro medidor— **los números absolutos no son confiables**; las tendencias y los
deltas sí. Para vos, que sos el ingeniero, esto es lo más importante que falta:
un medidor sin calibrar no sirve para documentar cumplimiento de un límite de
sala.

No lo implementé porque es una decisión de producto —¿dónde vive?, ¿se guarda
por dispositivo o por escena?— y prefiero que la tomes vos.

**No abrí la app en un navegador.** Nada de esto está verificado visualmente. El
kiosk es horizontal y a pantalla completa: es exactamente el tipo de layout donde
un cambio de barra inferior puede romperse. **Probalo en el teléfono, apaisado,
antes de confiarle un show.**
