# Contrato del motor 6.1

Coordenadas en metros: x lateral, y vertical, z del escenario hacia el público.
El receptor y objetivo pertenecen al recinto; todas las vistas usan el mismo
contrato de evaluación. El SPL es máximo orientativo de catálogo en una banda,
no nivel de operación ni exposición sonora. La cobertura es área de audiencia
sobre objetivo; la uniformidad es porcentaje dentro de ±3 dB de la media espacial.
No son magnitudes intercambiables.

El modo energético suma intensidades de fuentes independientes. El modo coherente
suma presiones complejas y fase ideal de filtros, propagación, delay y polaridad.
No incorpora fase medida del gabinete, acoplamiento de arrays ni reflexiones al
mapa directo. Una aproximación polar no es un archivo GLL/CLF del fabricante.
El plan DSP aceptado aporta ganancia, HPF/LPF LR24 y EQ RBJ; la banda nativa del
gabinete permanece limitada aunque se abra el filtro del plan.

RT: Sabine sobre absorción, incluyendo la ocupación actual; no interpolación
lineal entre tiempos. Con superficies explícitas, se calculan 125, 250, 500,
1000, 2000 y 4000 Hz mediante Sabine o Eyring. Cada superficie tiene área,
coeficientes y procedencia. La absorción de personas por banda continúa siendo
aproximada (0,4 m²/persona); no es una tabla medida del público concreto.
La geometría irregular ajusta volumen y máscara; sin superficies declaradas,
la envolvente acústica sigue siendo aproximada por las dimensiones del recinto.

Importa `geometry-example.json` desde Expediente → Geometría. Define un recinto
con ancho/largo >=12 m y alto >=5 m para ese ejemplo. Los balcones se dibujan,
pero no ocluyen/difractan sonido ni crean planos de audiencia múltiples.
Las exclusiones restringen posiciones del optimizador. El optimizador conserva
cantidades e IDs y respeta altura, grupos y zonas; no calcula capacidad de rigging.
Los gabinetes con dimensiones documentadas usan esas cotas; otros son esquemáticos.

Protección: P continua y carga → Vrms → ganancia real de etapa → dBu de entrada
→ referencia de escala completa DSP en dBu → dBFS. Se requiere coincidencia con
ruteo físico, canal, unidad de etapa y todas las cajas en paralelo. Un límite RMS
calculado no sustituye limitadores pico/excursión ni el preset del fabricante.
No se deduce el umbral eléctrico de `splMax` ni de potencia publicitaria del módulo.

La captura usa bloques de audio, no frames de pantalla. FAST = 125 ms; Leq integra
energía y duración. El máximo mostrado es RMS, no Lpeak conforme a norma. La
ponderación A digital se verifica sintéticamente; la cadena física debe calibrarse.
El ruido interrumpido produce una envolvente Z de 20 ms. T20, T30 y EDT son
ajustes separados; T20 requiere al menos 5 puntos, pendiente negativa, R²>=0,8 y
ruido al menos 10 dB bajo el extremo de ajuste. Se registra saturación o rechazo.
No se aplica integración inversa de Schroeder a esa envolvente.
