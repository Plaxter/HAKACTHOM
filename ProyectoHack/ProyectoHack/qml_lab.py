"""Mini laboratorio de Quantum Machine Learning con Qiskit.

Un clasificador de un qubit:
  1. La característica x se codifica como Ry(pi * x / 2).
  2. El modelo aprende un ángulo theta con otro Ry(theta).
  3. La probabilidad de medir 1 se interpreta como P(estrella rosa).

El gradiente se estima con la regla parameter-shift y el entrenamiento usa
descenso de gradiente de lote completo (SGD full-batch).
"""

import math

import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

FEATURE_MIN = -1.0
FEATURE_MAX = 1.0

XS = [-0.94, -0.80, -0.66, -0.51, -0.36, -0.20, 0.20, 0.36, 0.51, 0.66, 0.80, 0.94]
YS = [0.38, -0.52, 0.10, 0.56, -0.26, -0.05, 0.42, -0.36, 0.22, 0.55, -0.48, -0.08]

DATASET = [
    {
        "id": index,
        "x": x,
        "y": y,
        "label": 1 if x > 0 else 0,
        "label_name": "rosa" if x > 0 else "azul",
    }
    for index, (x, y) in enumerate(zip(XS, YS))
]

SHIFT = math.pi / 2
EPS = 1e-9


def probability_one(feature, theta):
    circuit = QuantumCircuit(1)
    circuit.ry(math.pi * feature / 2.0, 0)
    circuit.ry(theta, 0)
    probabilities = Statevector.from_instruction(circuit).probabilities()
    return float(probabilities[1])


def boundary_for(theta):
    """x donde la predicción cruza 50%: 1 - 2*theta/pi."""
    return 1.0 - (2.0 * theta / math.pi)


def predict(feature, theta):
    feature = float(feature)
    theta = float(theta)
    if not math.isfinite(feature) or not (FEATURE_MIN <= feature <= FEATURE_MAX):
        raise ValueError("La posición de la estrella debe estar entre -1 y 1.")
    if not math.isfinite(theta) or not (-2 * math.pi <= theta <= 2 * math.pi):
        raise ValueError("El ángulo theta está fuera de rango.")
    p_one = probability_one(feature, theta)
    label = 1 if p_one >= 0.5 else 0
    return {
        "feature": feature,
        "theta": round(theta, 6),
        "p_one": round(p_one, 6),
        "p_zero": round(1.0 - p_one, 6),
        "label": label,
        "label_name": "rosa" if label == 1 else "azul",
        "confidence": round(max(p_one, 1.0 - p_one), 6),
        "boundary": round(boundary_for(theta), 6),
    }


def _dataset_metrics(theta):
    loss = 0.0
    correct = 0
    for star in DATASET:
        p_one = probability_one(star["x"], theta)
        target = star["label"]
        loss += (p_one - target) ** 2
        prediction = 1 if p_one >= 0.5 else 0
        correct += int(prediction == target)
    return loss / len(DATASET), correct / len(DATASET)


def snapshot(theta=0.0):
    loss, accuracy = _dataset_metrics(theta)
    predictions = []
    for star in DATASET:
        p_one = probability_one(star["x"], theta)
        predictions.append(
            {
                "id": star["id"],
                "p_one": round(p_one, 6),
                "predicted": 1 if p_one >= 0.5 else 0,
            }
        )
    return {
        "theta": round(theta, 6),
        "boundary": round(boundary_for(theta), 6),
        "loss": round(loss, 6),
        "accuracy": round(accuracy, 4),
        "dataset": DATASET,
        "predictions": predictions,
        "meta": {
            "trainable_parameters": 1,
            "feature_map": "Ry(pi * x / 2)",
            "model": "Ry(theta) + medición",
            "framework": "Qiskit",
            "optimizer": "Descenso de gradiente (lote completo)",
            "gradient": "Regla parameter-shift",
            "loss": "Error cuadrático medio",
        },
    }


def train_classifier(theta_start=0.0, epochs=44, learning_rate=0.95):
    theta = float(theta_start)
    if not math.isfinite(theta):
        raise ValueError("Ángulo inicial inválido.")
    epochs = int(epochs)
    if not (8 <= epochs <= 80):
        raise ValueError("Las épocas deben estar entre 8 y 80.")
    learning_rate = float(learning_rate)
    if not (0.05 <= learning_rate <= 2.0):
        raise ValueError("La tasa de aprendizaje debe estar entre 0.05 y 2.0.")

    history = []
    best = None

    for epoch in range(epochs + 1):
        loss, accuracy = _dataset_metrics(theta)
        record = {
            "epoch": epoch,
            "loss": round(loss, 6),
            "accuracy": round(accuracy, 4),
            "theta": round(theta, 6),
            "boundary": round(boundary_for(theta), 6),
        }
        history.append(record)
        if best is None or (accuracy, -loss) > (best["accuracy"], -best["loss"]):
            best = record

        if epoch == epochs:
            break

        gradient = 0.0
        for star in DATASET:
            p_one = probability_one(star["x"], theta)
            p_plus = probability_one(star["x"], theta + SHIFT)
            p_minus = probability_one(star["x"], theta - SHIFT)
            slope = 0.5 * (p_plus - p_minus)
            # derivada de la pérdida cuadrática media: 2 * (p - y) * dp/dtheta
            gradient += 2.0 * (p_one - star["label"]) * slope
        gradient /= len(DATASET)
        gradient = max(-1.5, min(1.5, gradient))

        decay = 1.0 - 0.75 * (epoch / max(1, epochs))
        theta -= learning_rate * decay * gradient

    final_metrics = _dataset_metrics(theta)
    final_theta = theta
    # Si el último paso empeoró el ajuste, usamos el mejor punto visitado.
    final_loss, final_accuracy = final_metrics
    if (best["accuracy"], -best["loss"]) > (final_accuracy, -final_loss):
        final_theta = best["theta"]
        final_loss = best["loss"]
        final_accuracy = best["accuracy"]

    sample = QuantumCircuit(1, 1)
    sample.ry(math.pi * 0.5 / 2.0, 0)
    sample.ry(final_theta, 0)
    sample.measure(0, 0)

    predictions = []
    for star in DATASET:
        p_one = probability_one(star["x"], final_theta)
        predictions.append(
            {
                "id": star["id"],
                "p_one": round(p_one, 6),
                "predicted": 1 if p_one >= 0.5 else 0,
            }
        )

    return {
        "history": history,
        "theta": round(final_theta, 6),
        "boundary": round(boundary_for(final_theta), 6),
        "loss": round(final_loss, 6),
        "accuracy": round(final_accuracy, 4),
        "dataset": DATASET,
        "predictions": predictions,
        "sample_circuit": str(sample.draw(output="text")),
        "meta": {
            "epochs": epochs,
            "learning_rate": learning_rate,
            "parameter_shift": SHIFT,
            "optimizer": "Descenso de gradiente (lote completo)",
            "loss": "Error cuadrático medio",
            "trainable_parameters": 1,
            "feature_map": "Ry(pi * x / 2)",
            "model": "Ry(theta) + medición",
            "framework": "Qiskit",
        },
    }
