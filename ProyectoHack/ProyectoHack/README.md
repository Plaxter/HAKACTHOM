# ¡Super Qubit! · La Academia de los Qubits

Demo jugable, en 2D, para acercar la computación cuántica a estudiantes de **8 a 12 años**. El universo perdió su energía y cada mundo se restaura ejecutando un circuito real en **Qiskit + Aer**. Qubi, el compañero cuántico, acompaña al cadete desde el primer bit hasta un clasificador de *Quantum Machine Learning*.

- **6 mundos**, 5 retos de circuitos y 1 laboratorio de QML.
- **Mapa 2D explorable:** mueve a Qubi con WASD, flechas o cruceta, recoge 9 chispas y despierta los portales por proximidad.
- **Sala 2D dentro de cada nivel:** Qubi camina entre pedestales X, H, Z y CNOT, los descubre con E y activa el portal.
- Sin instalar nada en el navegador: Flask sirve el juego y el simulador.
- Progreso, estrellas, insignias, XP y sonido se guardan en `localStorage`.
- Todo el arte es SVG original y el sonido se genera con WebAudio.

## Inicio rápido

Requisitos: **Python 3.11 o superior** y conexión a internet solo la primera vez para instalar dependencias.

```bat
git clone <URL-del-repositorio>
cd ProyectoHack
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

También puedes ejecutar el lanzador, que crea el entorno virtual e instala dependencias la primera vez:

- **Windows:** `run.bat`
- **macOS / Linux:** `./run.sh`

Abre **http://127.0.0.1:5000**. No hay paso de compilación ni dependencias de npm.

Comprobaciones:

```bat
python tests.py
curl http://127.0.0.1:5000/api/health
```

Versiones fijadas para reproducibilidad: `Flask 3.1.3`, `Qiskit 2.6.1`, `qiskit-aer 0.18.0`.

### Portabilidad: clonar, ejecutar y compartir

El repositorio está pensado para publicarse en GitHub y abrirse en otra computadora sin ajustes:

- Solo requiere **Python 3.11+**; no hay rutas absolutas ni archivos locales fuera del proyecto.
- `run.bat` (Windows) y `run.sh` (macOS/Linux) crean `.venv`, instalan `requirements.txt` y arrancan el servidor.
- `HOST` y `PORT` se pueden cambiar por variable de entorno; por defecto `127.0.0.1:5000`.
- `.gitignore` excluye entornos virtuales, cachés de Python, bases locales y archivos del sistema.
- Las fuentes y todo el arte están incluidos localmente: el juego no depende de CDN.
- **No abras `templates/index.html` con doble clic.** El juego necesita el servidor Flask para ejecutar Qiskit de verdad; abrir el HTML directamente muestra la interfaz sin circuitos ni simulación.

Flujo para otra persona: clonar → instalar Python 3.11+ → `run.bat` o `./run.sh` → abrir `http://127.0.0.1:5000`.

Para publicarlo, crea un repositorio vacío en GitHub y, desde esta carpeta:

```bat
git init
git add .
git commit -m "Demo jugable de ¡Super Qubit!"
git branch -M main
git remote add origin <URL-del-repositorio>
git push -u origin main
```

## Cómo se juega

1. Explora la Academia y mueve a Qubi hasta un portal.
2. Dentro del nivel, camina por la sala 2D y descubre los pedestales de poderes con **E**.
3. Selecciona un poder (X, H, Z o CNOT) y colócalo en un cable de qubit.
4. Activa el portal: el servidor construye y ejecuta el circuito.
5. Observa las probabilidades, las amplitudes y la explicación científica.
6. Gana estrellas según el mínimo de poderes (par): 3 con el par, 2 con uno o dos extra, 1 con más.
7. Restaura los seis mundos para obtener el certificado final.

Los mundos se abren en orden. Los ya restaurados se pueden repetir: los circuitos dan +25 XP y el laboratorio QML +40 XP por práctica.

### Mapa explorable

- Qubi camina libremente por el tablero con **WASD**, las **flechas** o la **cruceta táctil**.
- Al acercarte a un portal aparece un aviso con su nombre y estado; pulsa **E** o el botón **Entrar** para abrirlo.
- Los portales sellados avisan sin abrirse; los restaurados se pueden volver a jugar.
- Hay **9 chispas de energía** decorativas: al recogerlas todas, el mapa celebra. No cambian XP, energía, estrellas ni insignias.
- El clic directo sobre cualquier portal sigue funcionando y es la vía principal en pantallas pequeñas.
- La exploración está disponible desde **761 px** de ancho. Por debajo, el mapa se convierte en una lista táctil de portales sin perder funciones. La cruceta aparece en tablets (761–980 px) y en cualquier dispositivo sin `hover`.

### Sala 2D de cada nivel

Cada reto de circuito ocurre en una sala temática sobre el portal:

- Qubi se mueve con **WASD**, las **flechas** o la **cruceta táctil** dentro de los límites de la sala.
- Hay **3 pedestales** (X, H, Z) en niveles de 1–2 qubits y **4** (X, H, Z, CNOT) en niveles de 3 qubits.
- Al acercarte, el pedestal brilla y aparece un aviso; pulsa **E** o toca el pedestal para abrir su ficha didáctica.
- La ficha explica qué hace la puerta, para qué sirve y cómo colocarla. El botón **Usar poder** la selecciona en el constructor.
- El contador **Descubiertos 0/3** registra la exploración; completar todos los pedestales celebra con confeti. Es un incentivo didáctico, no altera estrellas, XP ni insignias.
- El portal también es interactivo: al acercarte y pulsar **E** (o tocar la etiqueta) se activa el reto con el circuito actual.
- El constructor de circuitos, las pistas y la validación del servidor siguen funcionando igual: la sala añade exploración sin reemplazar el aprendizaje central.
- En pantallas táctiles la cruceta aparece automáticamente; el clic y el teclado siguen siendo alternativas completas.

### Retos y soluciones (para docentes y jueces)

| Mundo | Concepto | Circuito de referencia |
| --- | --- | --- |
| Reino de los Bits | Bit y puerta X | `X` en Q0 |
| Planeta de los Qubits | Superposición | `H` en Q0 |
| Templo de las Puertas | Fase e interferencia | `H · Z · H` en Q0 |
| Isla del Entrelazamiento | Estado de Bell | `H` en Q0 + `CNOT` Q0→Q1 |
| Fábrica de Circuitos | Estado GHZ | `H` en Q0 + `CNOT` Q0→Q1 + `CNOT` Q0→Q2 |
| Laboratorio QML | Clasificación variacional | Entrenar `Ry(θ)` y alcanzar 100% |

El par de poderes y las pistas dentro del juego permiten llegar a estas soluciones sin conocer la tabla.

### Patio de Juegos Cuánticos

Zona libre de 3 qubits, sin recompensas, con cuatro retos opcionales:

- **Cero absoluto:** `P(000) ≥ 98%`.
- **Cuatro caminos:** exactamente cuatro resultados con al menos 18% cada uno (94% de probabilidad cubierta).
- **Campana lejana:** exactamente dos resultados con al menos 42% cada uno que difieran en dos bits (por ejemplo, `000` y `110`).
- **Trío GHZ:** `P(000) ≥ 45%` y `P(111) ≥ 45%`.

## Qiskit de verdad

- Cada envío del jugador se convierte en un `QuantumCircuit` real.
- Las **probabilidades que se muestran** salen del `Statevector` exacto, no de una tabla.
- El histograma muestra **1024 mediciones** de `AerSimulator` con `seed_simulator=7`; por eso los conteos varían de forma realista mientras las probabilidades permanecen exactas.
- Las puertas permitidas son X, H, Z y CNOT. El servidor valida tipos, índices y que control y objetivo sean distintos.
- Cada respuesta incluye profundidad, amplitudes, conteos, versión de Qiskit/Aer y tiempo de ejecución.

### Laboratorio QML

Modelo de 1 qubit y 1 parámetro:

```text
x  →  Ry(πx/2)  →  Ry(θ)  →  medición
```

- Pérdida: error cuadrático medio.
- Gradiente: regla **parameter-shift**.
- Optimizador: descenso de gradiente de lote completo.
- Frontera de decisión: `x = 1 − 2θ/π`.
- Estado entrenado: `θ ≈ 1.570255`, precisión 100%, frontera en `x ≈ 0`.
- `P(rosa) = sin²((πx/2 + θ)/2)`.

El laboratorio entrena en el servidor con Qiskit y expone épocas, pérdida, historial y predicciones para que el aprendizaje sea observable, no una caja negra.

## Arquitectura

```text
ProyectoHack/
├─ app.py              Rutas Flask, validación, Aer y QML
├─ levels.py           Contenido, objetivos, pistas, recompensas y evaluación
├─ qml_lab.py          Clasificador cuántico y parameter-shift
├─ tests.py            Pruebas de humo de API, retos y QML
├─ requirements.txt    Dependencias fijadas
├─ run.bat             Arranque en Windows (crea el entorno si falta)
├─ run.sh              Arranque en macOS/Linux (crea el entorno si falta)
├─ .gitignore          Excluye entornos virtuales, cachés y archivos locales
├─ templates/
│  └─ index.html       Todas las pantallas y modales
└─ static/
   ├─ css/styles.css   Interfaz espacial, responsive e impresión
   ├─ favicon.svg      Icono original del juego
   ├─ assets/          Fuentes Baloo 2 y Nunito incluidas localmente
   └─ js/
      ├─ core.js       Estado, guardado, mapa, HUD, modales y certificado
      ├─ builder.js    Constructor de circuitos
      ├─ level.js      Flujo de retos e histogramas
      ├─ levelroom.js  Sala 2D del nivel: pedestales, proximidad y portal
      ├─ qml.js        Laboratorio QML
      ├─ extras.js     Puente QML y Patio de Juegos
      ├─ mapworld.js   Exploración 2D, chispas, proximidad y cruceta
      ├─ svg.js        Personajes y arte original
      ├─ audio.js      Efectos con WebAudio
      └─ app.js        Arranque y carga de datos
```

El backend no guarda partidas: cada navegador conserva su progreso. Esto facilita desplegar la demo, pero limita la analítica y la continuidad entre dispositivos.

### API

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/api/levels` | Mundos, insignias, rangos y metadatos cuánticos |
| `GET` | `/api/qml` | Snapshot del clasificador sin entrenar |
| `POST` | `/api/qml/train` | Entrenamiento con `theta_start`, `epochs` y `learning_rate` |
| `POST` | `/api/qml/predict` | Predicción para `feature` y `theta` |
| `POST` | `/api/run` | Ejecuta un circuito con `level_id` y `operations` |
| `GET` | `/api/health` | Versión de Qiskit/Aer, Python, mundos y shots |

Ejemplo:

```json
POST /api/run
{
  "level_id": "bell",
  "operations": [
    {"gate": "h", "qubits": [0]},
    {"gate": "cx", "qubits": [0, 1]}
  ]
}
```

Los qubits se muestran en orden `q0 q1 q2` de izquierda a derecha. CNOT se envía como `[control, objetivo]`.

## Decisión de diseño EdTech

- **Objetivo de aprendizaje explícito** por mundo y explicación inmediata después de cada intento.
- **Dos capas de exploración:** el mapa de la Academia elige el mundo; la sala 2D del nivel presenta los poderes antes de construir. Moverse no sustituye el circuito: lo prepara.
- **Andamiaje gradual:** pistas escritas, fichas de puertas al alcance de Qubi, diagnóstico específico cuando el portal no se abre y dificultad creciente.
- **Aprender haciendo:** el circuito es la acción central, no un video ni un cuestionario.
- **Juego, no solo botones:** caminar con Qubi da agencia y ritmo; las chispas del mapa y los pedestales descubiertos invitan a recorrer el espacio sin alterar la economía de recompensas.
- **Bajo umbral, alto techo:** los primeros retos se resuelven con una puerta; el patio libre y QML abren exploración.
- **Motivación:** estrellas, insignias, rangos, energía, confeti y repetición con recompensa reducida.
- **Metáfora consistente:** Qubi, guardianes, pedestales y portales explican conceptos sin sustituir la física real.
- **Accesibilidad:** sonido desactivable y persistente, foco atrapado en modales, `prefers-reduced-motion`, textos legibles, diseño responsive, instrucciones para lectores de pantalla, avisos de proximidad `aria-live` y crucetas con etiquetas. El clic, Tab y Enter siguen siendo una alternativa completa a ambas capas 2D.

## Rigor, seguridad y límites

- Cuerpo máximo de 64 KB y máximo 16 operaciones por circuito.
- Lista blanca de puertas; se rechazan índices inválidos, tipos inesperados y CNOT con control igual al objetivo.
- Probabilidades exactas y shots decorativos con semilla fija.
- Validación del objetivo en el servidor; el cliente nunca decide si un reto se superó.
- Sin cuentas, sin datos personales y sin telemetría en esta demo.

Límites actuales: una sola persona por navegador, contenido en español, clasificador QML de una característica y un parámetro, y ausencia de panel docente. El siguiente paso natural es una prueba piloto en aula con métricas de finalización y comprensión, y después añadir persistencia, más puertas y escenarios de QML.

## Validación realizada

Se recorrió la demo completa en navegador:

- Introducción, creación de cadete y mapa.
- Mapa 2D: movimiento continuo y diagonales, límites del tablero, aviso de proximidad, entrada con E, portales sellados, pausa al abrir modales, clic alternativo, recogida de las 9 chispas, confeti final, cruceta táctil y pausa/reanudación al cambiar de pantalla.
- Salas de nivel: movimiento y límites, 3 y 4 pedestales según qubits, aviso de proximidad, ficha didáctica con E, selección del poder desde la ficha, contador de descubrimientos, activación del portal con y sin circuito, pausa al abrir modales y al ejecutar.
- Responsive: exploración a 1440, 980, 800 y 761 px; lista de portales y controles ocultos a 760, 700 y 638 px; salas de nivel a 1440, 1064, 800 y 390 px; con emulación táctil (`hover: none`) las crucetas se muestran y la tecla E se oculta.
- Los seis mundos con sus circuitos, estrellas, recompensas e insignias.
- Histogramas, amplitudes y metadatos de Qiskit.
- Patio de Juegos y detección de los cuatro retos (cero, cuatro caminos, campana y GHZ).
- Entrenamiento QML, predicción, repetición y certificado.
- Diario, ayuda, reinicio de partida y persistencia tras recargar.
- Sin errores de consola y con respuestas correctas del servidor y de la API.

Las comprobaciones automatizadas de `python tests.py` cubren los seis retos, la seguridad de la entrada y el flujo QML.

## Créditos

Diseño, código, arte SVG, sonido y narrativa originales para esta demo. Fuentes **Baloo 2** y **Nunito**, incluidas localmente para que el juego funcione sin conexión.
