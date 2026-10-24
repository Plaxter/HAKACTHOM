"""Contenido y reglas de los mundos de ¡Super Qubit!."""

START_ENERGY = 20
TOTAL_XP = 1000

GATE_INFO = {
    "x": {"label": "Cambiar estado", "symbol": "X", "color": "#FFD166"},
    "h": {"label": "Superponer", "symbol": "H", "color": "#FF6BD6"},
    "z": {"label": "Girar fase", "symbol": "Z", "color": "#43E7FF"},
    "cx": {"label": "Entrelazar", "symbol": "CNOT", "color": "#7CFFCB"},
}

BADGES = {
    "first-spark": {
        "name": "Primera chispa",
        "description": "Encendiste el primer portal cuántico.",
        "icon": "bolt",
    },
    "two-worlds": {
        "name": "Doble realidad",
        "description": "Creaste una superposición perfecta 50/50.",
        "icon": "infinity",
    },
    "phase-weaver": {
        "name": "Tejedor de fase",
        "description": "Convertiste una fase invisible en un resultado.",
        "icon": "spiral",
    },
    "twin-stars": {
        "name": "Estrellas gemelas",
        "description": "Entrelazaste dos qubits como verdaderos gemelos.",
        "icon": "linked",
    },
    "ghz-architect": {
        "name": "Arquitecto GHZ",
        "description": "Hiciste cantar al unísono a tres qubits.",
        "icon": "network",
    },
    "qubi-trainer": {
        "name": "Entrenador de Qubi",
        "description": "Entrenaste un clasificador cuántico al 100%.",
        "icon": "brain",
    },
    "sandbox-explorer": {
        "name": "Explorador cuántico",
        "description": "Visitaste el Patio de Juegos y experimentaste libremente.",
        "icon": "compass",
    },
    "perfect-constellation": {
        "name": "Constelación perfecta",
        "description": "Ganaste 3 estrellas en todos los mundos de circuitos.",
        "icon": "trophy",
    },
}

RANKS = [
    {"min_xp": 0, "name": "Cadete", "level": 1},
    {"min_xp": 250, "name": "Explorador", "level": 2},
    {"min_xp": 500, "name": "Guardián", "level": 3},
    {"min_xp": 750, "name": "Maestro cuántico", "level": 4},
    {"min_xp": 1000, "name": "Héroe cuántico", "level": 5},
    {"min_xp": 1300, "name": "Leyenda", "level": 6},
]

LEVELS = [
    {
        "id": "bits",
        "index": 1,
        "type": "circuit",
        "name": "Reino de los Bits",
        "tagline": "Donde todo es 0 o 1",
        "guardian": "Lumi",
        "guardian_role": "Guardiana de la primera luz",
        "map": {"x": 12, "y": 69, "icon": "bits", "primary": "#FFD166", "secondary": "#FF9F5A"},
        "theme": {"primary": "#FFD166", "secondary": "#FF9F5A"},
        "qubits": 1,
        "par": 1,
        "reward": {"xp": 100, "energy": 10},
        "badge": "first-spark",
        "story": (
            "¡Bienvenido a la Academia, cadete! Una avería apagó los portales y el universo "
            "está perdiendo energía. Lumi, guardiana del Reino de los Bits, necesita que "
            "enciendas el primer portal usando un solo qubit."
        ),
        "mission": "Haz que el qubit termine en 1. El portal solo se abre con una certeza total.",
        "goal_chip": "Solo 1 · 100%",
        "hints": [
            "Todo qubit empieza en 0. Los bits clásicos solo conocen 0 y 1.",
            "El poder Cambiar estado (X) es un interruptor: convierte 0 en 1.",
            "Selecciona X y colócala en el cable de Q0. Después activa el portal.",
        ],
        "teach": (
            "La puerta X gira el qubit de |0⟩ a |1⟩. No hay misterio: si mides, "
            "obtienes 1 el 100% de las veces. Es tu primer hechizo cuántico."
        ),
        "success": "¡Primera chispa! El portal del reino vuelve a brillar.",
        "retry": "El portal sigue esperando un 1 seguro. Revisa qué probabilidad muestra tu circuito.",
        "objective": {"type": "only", "outcome": "1"},
    },
    {
        "id": "qubits",
        "index": 2,
        "type": "circuit",
        "name": "Planeta de los Qubits",
        "tagline": "Dos caminos al mismo tiempo",
        "guardian": "Órbita",
        "guardian_role": "Cartógrafa de probabilidades",
        "map": {"x": 31, "y": 43, "icon": "planet", "primary": "#FF6BD6", "secondary": "#B49CFF"},
        "theme": {"primary": "#FF6BD6", "secondary": "#B49CFF"},
        "qubits": 1,
        "par": 1,
        "reward": {"xp": 120, "energy": 10},
        "badge": "two-worlds",
        "story": (
            "Órbita dibuja mapas que no existen todavía. En su planeta, la luz duda "
            "entre dos futuros. Quiere ver un portal que viva en los dos a la vez."
        ),
        "mission": "Crea una superposición perfecta: 50% de probabilidad para 0 y 50% para 1.",
        "goal_chip": "50% / 50%",
        "hints": [
            "La puerta H crea superposición cuando el qubit está en 0.",
            "Selecciona Superponer (H) y colócala en Q0.",
            "Con un solo H basta. Si mides muchas veces, verás 0 y 1 casi por igual.",
        ],
        "teach": (
            "H convierte |0⟩ en (|0⟩ + |1⟩)/√2. El qubit no está escondido: su estado "
            "es una combinación real de ambos caminos. Al medir, la naturaleza elige 0 o 1 "
            "con 50% de probabilidad cada uno."
        ),
        "success": "¡El portal vive en dos realidades! Qubi está impresionado.",
        "retry": "La balanza aún no está perfecta. Necesitas que 0 y 1 aparezcan al 50%.",
        "objective": {"type": "split", "outcomes": ["0", "1"]},
    },
    {
        "id": "gates",
        "index": 3,
        "type": "circuit",
        "name": "Templo de las Puertas",
        "tagline": "El secreto está en la fase",
        "guardian": "Maese Umbral",
        "guardian_role": "Celador del templo",
        "map": {"x": 48, "y": 68, "icon": "temple", "primary": "#43E7FF", "secondary": "#5AA9FF"},
        "theme": {"primary": "#43E7FF", "secondary": "#5AA9FF"},
        "qubits": 1,
        "par": 3,
        "reward": {"xp": 150, "energy": 15},
        "badge": "phase-weaver",
        "story": (
            "Maese Umbral protege el Templo de las Puertas. Dice que la fase cuántica "
            "es invisible… hasta que haces interferir los caminos. El eco de tu circuito "
            "revelará el hechizo."
        ),
        "mission": "Abre el portal solo en 1 usando al menos una H y una Z. La fase debe volverse visible.",
        "goal_chip": "Solo 1 · usa H + Z",
        "hints": [
            "Z no cambia las probabilidades: cambia el signo (la fase) del camino 1.",
            "Prueba esta secuencia: Superponer, Girar fase, Superponer.",
            "La última H transforma la fase escondida en un resultado medible.",
        ],
        "teach": (
            "H crea (|0⟩ + |1⟩)/√2. Z convierte el signo + en −: (|0⟩ − |1⟩)/√2. "
            "Ese signo no se ve al medir… hasta que una segunda H lo transforma en |1⟩. "
            "La fase, invisible, cambió el destino del qubit."
        ),
        "success": "¡Eco de fase dominado! El templo reconoce tu magia.",
        "retry": "La fase aún no produce el eco esperado. Recuerda que medir sin interferencia no revela el signo.",
        "objective": {"type": "only", "outcome": "1", "require_gates": ["h", "z"]},
    },
    {
        "id": "bell",
        "index": 4,
        "type": "circuit",
        "name": "Isla del Entrelazamiento",
        "tagline": "Dos qubits, un solo destino",
        "guardian": "Nara",
        "guardian_role": "Tejedora de vínculos",
        "map": {"x": 65, "y": 38, "icon": "island", "primary": "#7CFFCB", "secondary": "#3ED6B0"},
        "theme": {"primary": "#7CFFCB", "secondary": "#3ED6B0"},
        "qubits": 2,
        "par": 2,
        "reward": {"xp": 180, "energy": 15},
        "badge": "twin-stars",
        "story": (
            "En la Isla del Entrelazamiento, Nara teje vínculos entre almas. Dos qubits "
            "deben responder al unísono: si uno dice 0, el otro también. Si uno dice 1, "
            "el otro también."
        ),
        "mission": "Entrelaza Q0 y Q1: el portal solo debe mostrar 00 y 11, cada uno al 50%. Nunca 01 ni 10.",
        "goal_chip": "00 / 11 · 50% c/u",
        "hints": [
            "Crea superposición en Q0 con una H.",
            "El poder Entrelazar (CNOT) usa dos cables: primero eliges el control y luego el objetivo.",
            "Coloca CNOT con control Q0 y objetivo Q1. La duda de Q0 se copia a Q1.",
        ],
        "teach": (
            "H en Q0 crea un «quizás». La CNOT copia esa duda a Q1 y produce "
            "(|00⟩ + |11⟩)/√2. Ya no son dos qubits independientes: son un solo sistema. "
            "Los resultados 01 y 10 son imposibles."
        ),
        "success": "¡Nacieron los gemelos cuánticos! Lo que siente uno, el otro lo sabe.",
        "retry": "Los qubits aún no responden al unísono. Fíjate si aparecen 01 o 10: eso rompe el vínculo.",
        "objective": {"type": "split", "outcomes": ["00", "11"], "require_gates": ["cx"]},
    },
    {
        "id": "factory",
        "index": 5,
        "type": "circuit",
        "name": "Fábrica de Circuitos",
        "tagline": "Tres qubits, una voluntad",
        "guardian": "Volt",
        "guardian_role": "Ingeniera de la energía",
        "map": {"x": 79, "y": 65, "icon": "factory", "primary": "#FF9F5A", "secondary": "#FFD166"},
        "theme": {"primary": "#FF9F5A", "secondary": "#FFD166"},
        "qubits": 3,
        "par": 3,
        "reward": {"xp": 200, "energy": 15},
        "badge": "ghz-architect",
        "story": (
            "La Fábrica que alimenta la Academia se apagó. Volt necesita el legendario "
            "estado GHZ: tres qubits que cantan al unísono, todos ceros o todos unos. "
            "Es la llave para reconectar el flujo de energía."
        ),
        "mission": "Construye el estado GHZ: solo 000 y 111, con 50% cada uno. Ni un 001 se permite.",
        "goal_chip": "000 / 111 · 50% c/u",
        "hints": [
            "Empieza con una H en Q0 para abrir la superposición.",
            "Usa CNOT con control Q0 y objetivo Q1.",
            "Añade otra CNOT con control Q1 y objetivo Q2: la duda viaja por la cadena.",
        ],
        "teach": (
            "El estado GHZ (|000⟩ + |111⟩)/√2 reparte una sola decisión entre tres qubits. "
            "Si mides uno y obtienes 0, los otros también serán 0; si obtienes 1, todos serán 1. "
            "Su vínculo no depende de la distancia."
        ),
        "success": "¡Flujo de energía restaurado! Tres qubits, una sola canción.",
        "retry": "La fábrica necesita que los tres estén de acuerdo. ¿Aparecen resultados mezclados?",
        "objective": {"type": "split", "outcomes": ["000", "111"], "require_gates": ["cx"]},
    },
    {
        "id": "qml",
        "index": 6,
        "type": "qml",
        "name": "Laboratorio QML",
        "tagline": "Enseña a Qubi a clasificar estrellas",
        "guardian": "Nova",
        "guardian_role": "Científica de aprendizaje cuántico",
        "map": {"x": 90, "y": 29, "icon": "lab", "primary": "#B49CFF", "secondary": "#FF6BD6"},
        "theme": {"primary": "#B49CFF", "secondary": "#FF6BD6"},
        "qubits": 1,
        "par": 0,
        "reward": {"xp": 250, "energy": 15},
        "badge": "qubi-trainer",
        "story": (
            "Nova estudia cómo las máquinas cuánticas aprenden. Qubi quiere clasificar "
            "estrellas azules y rosas, pero su circuito aún no sabe dónde trazar la frontera. "
            "Ajusta sus parámetros con un entrenamiento real."
        ),
        "mission": "Entrena el clasificador cuántico hasta alcanzar 100% de precisión.",
        "goal_chip": "Precisión 100%",
        "hints": [
            "La posición x de la estrella se codifica como una rotación Ry(x · π/2).",
            "El modelo aprende un ángulo θ con descenso de gradiente y parameter-shift.",
            "Pulsa Entrenar a Qubi y observa cómo la frontera se desliza hasta separar los colores.",
        ],
        "teach": (
            "Una red cuántica diminuta: codificamos la posición x como una rotación "
            "Ry(πx/2) y aplicamos un segundo parámetro entrenable Ry(θ). La medición entrega "
            "una probabilidad que convertimos en clase. El gradiente se estima con "
            "parameter-shift, una técnica real de QML, y todo se evalúa con Qiskit."
        ),
        "success": "¡Qubi clasifica las estrellas con un circuito cuántico real!",
        "retry": "El modelo aún no separa las estrellas. Sigue entrenando.",
        "objective": {"type": "qml", "min_accuracy": 0.99},
    },
]

LEVEL_BY_ID = {level["id"]: level for level in LEVELS}


def public_level(level):
    """Quita las reglas internas antes de enviar el nivel al navegador."""
    keys = [
        "id", "index", "type", "name", "tagline", "guardian", "guardian_role", "map",
        "theme", "qubits", "par", "reward", "badge", "story", "mission", "goal_chip",
        "hints", "teach", "success", "retry", "objective",
    ]
    data = {}
    for key in keys:
        if key == "objective":
            continue
        data[key] = level.get(key)
    data["objective"] = {"type": level["objective"]["type"]}
    for key in ("require_gates", "outcome", "outcomes", "min_accuracy"):
        if key in level["objective"]:
            data["objective"][key] = level["objective"][key]
    return data


def public_levels():
    return [public_level(level) for level in LEVELS]


def attempt_diagnosis(level, probabilities, used_gates, missing):
    if missing:
        labels = [GATE_INFO[g]["label"] for g in missing]
        return "Falta un ingrediente del hechizo: " + " y ".join(labels) + "."
    objective = level["objective"]
    if objective["type"] == "only":
        target = objective["outcome"]
        probability = probabilities.get(target, 0.0)
        return (
            f"El portal se abre solo con {target} al 100%. Tu circuito dio "
            f"{round(probability * 100)}% de probabilidad a {target}."
        )
    if objective["type"] == "split":
        outcomes = " y ".join(objective["outcomes"])
        return (
            f"El portal necesita únicamente {outcomes}, ambos cerca del 50%. "
            "Mira las barras: los resultados inesperados rompen el hechizo."
        )
    return level["retry"]


def count_ops(operations):
    return len(operations)


def evaluate(level, probabilities, operations):
    """Evalúa el circuito con probabilidades exactas y devuelve el resultado de la misión."""
    objective = level["objective"]
    if objective["type"] == "qml":
        return {"success": False, "stars": 0, "missing": [], "diagnosis": "Mundo especial."}

    used_gates = {op["gate"] for op in operations}
    required = objective.get("require_gates", [])
    missing = [gate for gate in required if gate not in used_gates]

    if objective["type"] == "only":
        target = objective["outcome"]
        leakage = sum(p for state, p in probabilities.items() if state != target)
        hit = probabilities.get(target, 0.0) >= 0.985 and leakage <= 0.02
    elif objective["type"] == "split":
        allowed = objective["outcomes"]
        leakage = sum(p for state, p in probabilities.items() if state not in allowed)
        balanced = all(0.46 <= probabilities.get(state, 0.0) <= 0.54 for state in allowed)
        hit = balanced and leakage <= 0.02
    else:
        hit = False

    gate_count = count_ops(operations)
    success = bool(hit and not missing)
    stars = 0
    if success:
        if gate_count <= level["par"]:
            stars = 3
        elif gate_count <= level["par"] + 2:
            stars = 2
        else:
            stars = 1

    return {
        "success": success,
        "stars": stars,
        "missing": missing,
        "gate_count": gate_count,
        "diagnosis": attempt_diagnosis(level, probabilities, used_gates, missing),
    }
