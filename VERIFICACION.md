# Cómo cubrir lo que falta

Son dos problemas distintos y se cubren distinto.

---

## Parte 1 — Cobertura de tests: 68 % → **75 %**

`tsc` limpio · **244 tests** (antes 221) · `eslint` 0 errores · build OK

| Motor | Antes | Ahora |
|---|---|---|
| `system-vitals` | 43 % | **91 %** |
| `pa-engine` | 67 % | **88 %** |
| `stage-engine`, `dynamics`, `acoustics` | — | 100 % |
| `dsp-engine`, `modal-eq`, `spl-grid` | — | 98–99 % |

### Me corrijo: no era "la parte narrativa"

Cuando te dije que lo sin cubrir en `pa-engine` era texto, no lo había mirado.
Fui a ver las líneas exactas y son:

- **`gearMatchScore`** — el motor que decide **qué equipo te recomienda la app**.
  No es narrativa: es el puntaje que ordena la lista.
- **El constructor de curvas de EQ** en `system-vitals` — lo que se **dibuja en
  la pantalla DSP**.

Los dos son lógica que sale por pantalla. Buena cosa que preguntaras.

### Qué verifican los 23 tests nuevos

Del recomendador de equipo: que el puntaje esté siempre entre 0 y 100 sin NaN
para las 7 categorías × 5 capacidades × 4 valores de RT60; que un show grande
prefiera más SPL; que **penalice el exceso en salas chicas** (una caja de 146 dB
para 150 personas no es "mejor", es sobredimensionar — si el puntaje no lo
refleja, la app te recomienda mal); y que el mismo amplificador valga más en un
show chico que en uno grande.

De las curvas de EQ: que un realce de campana tenga su máximo **en** la
frecuencia central (si cae en otro lado, el gráfico miente sobre dónde estás
tocando), que una Q más alta dé una campana más angosta, que el paso alto
atenúe abajo y deje pasar arriba, y que las bandas se sumen entre sí.

De la cobertura por zonas: que **el frente nunca reciba menos nivel que el
fondo**, y que la uniformidad sea un porcentaje real.

### Dos falsos positivos que rastreé

Los tests marcaron "fallo" en el puntaje de amplificadores y en un crash sin
equipo. **Los dos eran míos.** El modelo usa ~4 W por persona, así que 3000 W
para 2000 personas cae en el mismo tramo que 300 W — mi test comparaba dos
valores del mismo bucket. Y `calculatePARecommendation` toma 6 argumentos, yo le
pasaba 5. El código estaba bien las dos veces.

### Lo que queda sin cubrir y no vale la pena

`rt60-measure` (28 %) necesita audio real; testearlo requiere mockear Web Audio
entero. `test-signals` y `gear-database` son generadores de tono y datos
estáticos. Cubrirlos daría un número más lindo y cero información.

---

## Parte 2 — Lo que ningún test puede cubrir

Esto no se resuelve con más tests. Un test verifica que el código haga lo que yo
creo que debe hacer; **no verifica que lo que yo creo esté bien**.

Los nueve casos que encontré fueron todos de *inconsistencia interna* —dos
pantallas discrepando, una etiqueta contradiciendo un motor—. Eso el análisis
estático lo ve. Lo que **no** puede ver es si el modelo entero está corrido
respecto de la realidad física.

### Protocolo de verificación en campo

Necesitás cuatro sesiones. Vos tenés la ventaja que yo no tengo: podés comparar
contra la realidad.

**A · Una sala que conocés de memoria (Canaán).**
Cargá el recinto y el rig real. Antes de mirar la app, escribí en un papel qué
RT60 esperás y qué cruce usás. Después comparalos.
→ *Si el RT60 estimado difiere más de 0.3 s del que medís con el módulo RT60,
el modelo de Sabine está mal calibrado para esa sala.*

**B · El SPL contra una referencia.**
Calibrá el medidor contra un sonómetro prestado o un calibrador de 94 dB. Después
comparalo con el **headroom** que reporta la app con el sistema al 100 %.
→ *Ésta es la que más me interesa: el cambio de `20·log10` a `10·log10` bajó el
SPL reportado 6 dB. Si en la práctica te queda corto, el modelo incoherente es
demasiado conservador para tu tipo de rig.*

**C · La alineación, con oídos.**
Aplicá el delay sub↔top que da la app y escuchá el cruce. Después buscalo a mano
como lo hacés siempre.
→ *Si tu valor a oído difiere más de 2 ms del calculado, la geometría que asume
el motor (top al 75 % de la altura, oyente a media platea) no coincide con cómo
desplegás vos.*

**D · Un show al aire libre, en verano.**
Es el único caso donde la temperatura importa de verdad. Cargá 33-35 °C y mirá
si los delays y la absorción de agudos se corresponden con lo que tenés que
compensar en la consola.

### Qué hacer con lo que encuentres

Anotá **el número que esperabas y el que dio la app**. Con eso yo puedo ubicar
qué motor está corrido y en qué dirección. Un "esto no suena bien" no me sirve;
un "la app dijo 4.2 ms y a oído me quedó en 6.8" me lleva directo a la línea.

---

## Estado

| | |
|---|---|
| Cobertura de motores | **75 %** |
| Tests | **244** |
| Afirmaciones falsas corregidas | 9 |
| Patrón `[0]` | 7 casos, todos cerrados |
| Verificación contra la realidad física | **pendiente — es tuya** |
