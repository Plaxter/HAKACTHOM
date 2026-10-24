"""¡Super Qubit! — servidor del demo.

Ejecuta los circuitos creados por el jugador con Qiskit + Aer y expone el
mini laboratorio de QML. Todo el estado de la partida vive en el navegador
(localStorage) para que el demo sea fácil de desplegar.
"""

import math
import os
import platform
import time

from flask import Flask, jsonify, render_template, request
from qiskit import QuantumCircuit
from qiskit import __version__ as QISKIT_VERSION
from qiskit.quantum_info import Statevector
from qiskit_aer import AerSimulator
from qiskit_aer import __version__ as AER_VERSION

from levels import (
    BADGES,
    GATE_INFO,
    LEVEL_BY_ID,
    LEVELS,
    RANKS,
    START_ENERGY,
    TOTAL_XP,
    evaluate,
    public_levels,
)
from qml_lab import predict as qml_predict
from qml_lab import snapshot as qml_snapshot
from qml_lab import train_classifier

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024
app.json.ensure_ascii = False

SHOTS = 1024
SEED = 7
MAX_OPERATIONS = 16
GATE_QUBITS = {"x": 1, "h": 1, "z": 1, "cx": 2}


class InvalidCircuit(ValueError):
    pass


def api_ok(payload, status=200):
    response = jsonify(payload)
    response.headers["Cache-Control"] = "no-store"
    return response, status


def api_error(message, status=400):
    return api_ok({"ok": False, "error": message}, status)


def parse_operations(raw, qubits):
    if not isinstance(raw, list):
        raise InvalidCircuit("Las operaciones deben venir en una lista.")
    if len(raw) > MAX_OPERATIONS:
        raise InvalidCircuit(f"El circuito admite hasta {MAX_OPERATIONS} poderes por misión.")

    parsed = []
    for index, operation in enumerate(raw, start=1):
        if not isinstance(operation, dict):
            raise InvalidCircuit("Cada poder debe ser un objeto válido.")
        gate = operation.get("gate")
        if gate not in GATE_QUBITS:
            raise InvalidCircuit(f"El poder número {index} no existe.")
        raw_qubits = operation.get("qubits")
        if not isinstance(raw_qubits, list) or len(raw_qubits) != GATE_QUBITS[gate]:
            raise InvalidCircuit(f"El poder número {index} necesita {GATE_QUBITS[gate]} qubit(s).")

        clean = []
        for raw_qubit in raw_qubits:
            if isinstance(raw_qubit, bool) or not isinstance(raw_qubit, int):
                raise InvalidCircuit("Los qubits deben ser números enteros.")
            if not (0 <= raw_qubit < qubits):
                raise InvalidCircuit(f"El circuito tiene {qubits} qubit(s): índice fuera de rango.")
            clean.append(raw_qubit)
        if gate == "cx" and clean[0] == clean[1]:
            raise InvalidCircuit("El control y el objetivo de CNOT deben ser distintos.")

        parsed.append({"gate": gate, "qubits": clean})
    return parsed


def build_circuit(qubits, operations):
    circuit = QuantumCircuit(qubits)
    for operation in operations:
        gate = operation["gate"]
        first = operation["qubits"][0]
        if gate == "x":
            circuit.x(first)
        elif gate == "h":
            circuit.h(first)
        elif gate == "z":
            circuit.z(first)
        elif gate == "cx":
            circuit.cx(first, operation["qubits"][1])
    return circuit


def state_payload(circuit, qubits):
    state = Statevector.from_instruction(circuit)
    probabilities = {}
    amplitudes = []
    for index in range(1 << qubits):
        basis = format(index, f"0{qubits}b")[::-1]
        amplitude = complex(state.data[index])
        probability = float(abs(amplitude) ** 2)
        if probability < 1e-9:
            probability = 0.0
        probabilities[basis] = probability
        amplitudes.append(
            {
                "basis": basis,
                "real": round(float(amplitude.real), 6),
                "imag": round(float(amplitude.imag), 6),
                "probability": round(probability, 6),
            }
        )
    return probabilities, amplitudes


def measured_counts(circuit):
    measured = circuit.copy()
    measured.measure_all()
    result = AerSimulator().run(
        measured, shots=SHOTS, seed_simulator=SEED
    ).result()
    raw_counts = result.get_counts()
    # Qiskit usa orden little-endian; lo invertimos para leer q0.q1.q2 de izquierda a derecha.
    return {key[::-1]: int(value) for key, value in raw_counts.items()}


def display_operations(operations):
    return [
        {
            "gate": operation["gate"],
            "qubits": operation["qubits"],
            "label": GATE_INFO[operation["gate"]]["label"],
            "symbol": GATE_INFO[operation["gate"]]["symbol"],
        }
        for operation in operations
    ]


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/levels")
def levels_api():
    return api_ok(
        {
            "ok": True,
            "levels": public_levels(),
            "badges": BADGES,
            "ranks": RANKS,
            "start_energy": START_ENERGY,
            "total_xp": TOTAL_XP,
            "gates": GATE_INFO,
            "quantum": {
                "qiskit": QISKIT_VERSION,
                "aer": AER_VERSION,
                "shots": SHOTS,
                "seed": SEED,
            },
        }
    )


@app.get("/api/qml")
def qml_state_api():
    payload = qml_snapshot(0.0)
    payload["ok"] = True
    return api_ok(payload)


@app.post("/api/qml/train")
def qml_train_api():
    body = request.get_json(silent=True) or {}
    try:
        theta_start = float(body.get("theta_start", 0.0))
        epochs = int(body.get("epochs", 44))
        learning_rate = float(body.get("learning_rate", 0.95))
        started = time.perf_counter()
        result = train_classifier(
            theta_start=theta_start,
            epochs=epochs,
            learning_rate=learning_rate,
        )
        result["ok"] = True
        result["runtime_ms"] = round((time.perf_counter() - started) * 1000, 1)
        result["quantum"] = {
            "qiskit": QISKIT_VERSION,
            "aer": AER_VERSION,
            "technique": "parameter-shift",
        }
        return api_ok(result)
    except (TypeError, ValueError) as error:
        return api_error(str(error))
    except Exception:
        app.logger.exception("Error inesperado en el laboratorio QML")
        return api_error("El laboratorio cuántico se distrajo. Inténtalo otra vez.", 500)


@app.post("/api/qml/predict")
def qml_predict_api():
    body = request.get_json(silent=True) or {}
    try:
        feature = float(body.get("feature"))
        theta = float(body.get("theta"))
        result = qml_predict(feature, theta)
        result["ok"] = True
        return api_ok(result)
    except (TypeError, ValueError) as error:
        return api_error(str(error))
    except Exception:
        app.logger.exception("Error inesperado al predecir con Qiskit")
        return api_error("No pudimos clasificar esa estrella.", 500)


@app.post("/api/run")
def run_api():
    body = request.get_json(silent=True) or {}
    level_id = body.get("level_id", "free")
    started = time.perf_counter()

    try:
        if level_id == "free":
            level = None
            qubits = body.get("qubits", 2)
            if isinstance(qubits, bool) or not isinstance(qubits, int) or not (1 <= qubits <= 3):
                raise InvalidCircuit("El patio admite entre 1 y 3 qubits.")
        else:
            level = LEVEL_BY_ID.get(level_id)
            if level is None:
                raise InvalidCircuit("Ese mundo no existe.")
            if level["type"] != "circuit":
                raise InvalidCircuit("Este mundo se juega en el Laboratorio QML.")
            qubits = level["qubits"]

        operations = parse_operations(body.get("operations"), qubits)
        if level is not None and not operations:
            raise InvalidCircuit("Coloca al menos un poder en el circuito antes de activar el portal.")

        circuit = build_circuit(qubits, operations)
        probabilities, amplitudes = state_payload(circuit, qubits)
        counts = measured_counts(circuit)
        for outcome in counts:
            probabilities.setdefault(outcome, 0.0)
        if level is not None:
            for outcome in probabilities:
                counts.setdefault(outcome, 0)

        runtime_ms = round((time.perf_counter() - started) * 1000, 1)

        if level is None:
            evaluation = {
                "success": None,
                "stars": None,
                "missing": [],
                "gate_count": len(operations),
                "diagnosis": None,
            }
            rewards = {"xp": 0, "energy": 0, "badge": None}
            explanation = (
                "Modo libre: cambia los poderes y observa cómo se transforman las "
                "probabilidades. No hay respuesta incorrecta."
            )
            success_text = None
            level_payload = {"id": "free", "name": "Patio de Juegos Cuánticos"}
        else:
            evaluation = evaluate(level, probabilities, operations)
            rewards = {
                "xp": level["reward"]["xp"],
                "energy": level["reward"]["energy"],
                "badge": level["badge"] if evaluation["success"] else None,
            }
            explanation = level["teach"] if evaluation["success"] else level["retry"]
            success_text = level["success"] if evaluation["success"] else None
            level_payload = {
                "id": level["id"],
                "name": level["name"],
                "par": level["par"],
                "goal_chip": level["goal_chip"],
            }

        return api_ok(
            {
                "ok": True,
                "level": level_payload,
                "success": evaluation["success"],
                "stars": evaluation["stars"],
                "gate_count": evaluation["gate_count"],
                "missing_gates": evaluation["missing"],
                "diagnosis": evaluation["diagnosis"],
                "explanation": explanation,
                "success_text": success_text,
                "operations": display_operations(operations),
                "used_gates": sorted({operation["gate"] for operation in operations}),
                "probabilities": probabilities,
                "counts": counts,
                "amplitudes": amplitudes,
                "shots": SHOTS,
                "depth": circuit.depth(),
                "rewards": rewards,
                "runtime_ms": runtime_ms,
                "quantum": {
                    "qiskit": QISKIT_VERSION,
                    "aer": AER_VERSION,
                    "backend": "AerSimulator",
                    "shots": SHOTS,
                    "seed": SEED,
                },
            }
        )
    except InvalidCircuit as error:
        return api_error(str(error))
    except Exception:
        app.logger.exception("Error inesperado ejecutando un circuito")
        return api_error("El simulador cuántico se distrajo. Inténtalo otra vez.", 500)


@app.get("/api/health")
def health():
    return api_ok(
        {
            "ok": True,
            "service": "super-qubit-demo",
            "qiskit": QISKIT_VERSION,
            "aer": AER_VERSION,
            "python": platform.python_version(),
            "worlds": len(LEVELS),
            "shots": SHOTS,
        }
    )


@app.errorhandler(404)
def not_found(_error):
    if request.path.startswith("/api/"):
        return api_error("Ruta no encontrada.", 404)
    return render_template("index.html"), 404


@app.errorhandler(413)
def too_large(_error):
    return api_error("El circuito es demasiado grande.", 413)


if __name__ == "__main__":
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "5000"))
    app.run(host=host, port=port, debug=False)
