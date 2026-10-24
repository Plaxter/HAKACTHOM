"""Pruebas de humo de ¡Super Qubit!.

Se ejecutan sin levantar el servidor:

    python tests.py

Cubren los seis retos, la validación defensiva de circuitos y el laboratorio QML.
"""

import unittest

from app import app


class SuperQubitTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = app.test_client()

    def run_level(self, level_id, operations):
        response = self.client.post(
            "/api/run",
            json={"level_id": level_id, "operations": operations},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload["ok"])
        return payload

    def test_health(self):
        payload = self.client.get("/api/health").get_json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["worlds"], 6)
        self.assertEqual(payload["shots"], 1024)

    def test_levels_catalog(self):
        payload = self.client.get("/api/levels").get_json()
        self.assertEqual(len(payload["levels"]), 6)
        self.assertEqual(payload["total_xp"], 1000)
        self.assertEqual(payload["start_energy"], 20)
        self.assertEqual(payload["levels"][0]["objective"]["type"], "only")
        self.assertIn("teach", payload["levels"][0])

    def test_bits_level(self):
        payload = self.run_level("bits", [{"gate": "x", "qubits": [0]}])
        self.assertTrue(payload["success"])
        self.assertEqual(payload["stars"], 3)
        self.assertAlmostEqual(payload["probabilities"]["1"], 1.0, places=6)
        self.assertEqual(payload["used_gates"], ["x"])

    def test_qubits_level(self):
        payload = self.run_level("qubits", [{"gate": "h", "qubits": [0]}])
        self.assertTrue(payload["success"])
        self.assertAlmostEqual(payload["probabilities"]["0"], 0.5, places=6)
        self.assertAlmostEqual(payload["probabilities"]["1"], 0.5, places=6)

    def test_gates_level_uses_phase(self):
        operations = [
            {"gate": "h", "qubits": [0]},
            {"gate": "z", "qubits": [0]},
            {"gate": "h", "qubits": [0]},
        ]
        payload = self.run_level("gates", operations)
        self.assertTrue(payload["success"])
        self.assertEqual(payload["stars"], 3)
        self.assertAlmostEqual(payload["probabilities"]["1"], 1.0, places=6)

    def test_bell_level(self):
        operations = [
            {"gate": "h", "qubits": [0]},
            {"gate": "cx", "qubits": [0, 1]},
        ]
        payload = self.run_level("bell", operations)
        self.assertTrue(payload["success"])
        self.assertEqual(payload["stars"], 3)
        self.assertAlmostEqual(payload["probabilities"]["00"], 0.5, places=6)
        self.assertAlmostEqual(payload["probabilities"]["11"], 0.5, places=6)
        self.assertAlmostEqual(payload["probabilities"]["01"], 0.0, places=6)

    def test_ghz_level(self):
        operations = [
            {"gate": "h", "qubits": [0]},
            {"gate": "cx", "qubits": [0, 1]},
            {"gate": "cx", "qubits": [0, 2]},
        ]
        payload = self.run_level("factory", operations)
        self.assertTrue(payload["success"])
        self.assertEqual(payload["stars"], 3)
        self.assertAlmostEqual(payload["probabilities"]["000"], 0.5, places=6)
        self.assertAlmostEqual(payload["probabilities"]["111"], 0.5, places=6)

    def test_free_mode_has_no_rewards(self):
        payload = self.run_level(
            "free",
            [
                {"gate": "h", "qubits": [0]},
                {"gate": "cx", "qubits": [0, 1]},
            ],
        )
        self.assertIsNone(payload["success"])
        self.assertIsNone(payload["stars"])
        self.assertEqual(payload["rewards"], {"xp": 0, "energy": 0, "badge": None})

    def test_rejects_unknown_gate(self):
        response = self.client.post(
            "/api/run",
            json={"level_id": "bits", "operations": [{"gate": "swap", "qubits": [0]}]},
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.get_json()["ok"])

    def test_rejects_cnot_with_same_qubit(self):
        response = self.client.post(
            "/api/run",
            json={"level_id": "bell", "operations": [{"gate": "cx", "qubits": [0, 0]}]},
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.get_json()["ok"])

    def test_rejects_more_than_16_operations(self):
        operations = [{"gate": "x", "qubits": [0]}] * 17
        response = self.client.post(
            "/api/run",
            json={"level_id": "bits", "operations": operations},
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.get_json()["ok"])

    def test_qml_training_and_prediction(self):
        response = self.client.post("/api/qml/train", json={"epochs": 44})
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload["ok"])
        self.assertAlmostEqual(payload["accuracy"], 1.0, places=6)
        self.assertAlmostEqual(payload["theta"], 1.570255, places=4)

        theta = payload["theta"]
        positive = self.client.post(
            "/api/qml/predict", json={"feature": 0.4, "theta": theta}
        ).get_json()
        negative = self.client.post(
            "/api/qml/predict", json={"feature": -0.4, "theta": theta}
        ).get_json()
        self.assertEqual(positive["label"], 1)
        self.assertEqual(negative["label"], 0)
        self.assertGreater(positive["p_one"], 0.7)


if __name__ == "__main__":
    unittest.main(verbosity=2)
