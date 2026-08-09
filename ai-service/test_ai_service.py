"""
Unit tests for AI Service (severity scoring & FastAPI endpoints).
"""

import unittest
from severity import compute_score
from main import app, health, list_models, MODELS_CONFIG


class TestSeverityScoring(unittest.TestCase):
    def test_empty_detections(self):
        total, score, severity = compute_score({})
        self.assertEqual(total, 0)
        self.assertEqual(score, 0)
        self.assertEqual(severity, "Low")

    def test_none_detections(self):
        total, score, severity = compute_score(None)
        self.assertEqual(total, 0)
        self.assertEqual(score, 0)
        self.assertEqual(severity, "Low")

    def test_low_severity(self):
        # bottle (2.0 * 2 = 4.0), can (1.5 * 1 = 1.5) => raw 5.5 => rounded 6 => Low (<=10)
        total, score, severity = compute_score({"bottle": 2, "can": 1})
        self.assertEqual(total, 3)
        self.assertEqual(score, 6)
        self.assertEqual(severity, "Low")

    def test_moderate_severity(self):
        # bottle (2.0 * 5 = 10), bag (3.0 * 5 = 15) => raw 25 => Moderate (11-30)
        total, score, severity = compute_score({"bottle": 5, "bag": 5})
        self.assertEqual(total, 10)
        self.assertEqual(score, 25)
        self.assertEqual(severity, "Moderate")

    def test_high_severity(self):
        # bag (3.0 * 15 = 45) => High (31-60)
        total, score, severity = compute_score({"bag": 15})
        self.assertEqual(total, 15)
        self.assertEqual(score, 45)
        self.assertEqual(severity, "High")

    def test_severe_severity(self):
        # bag (3.0 * 30 = 90) => Severe (>60)
        total, score, severity = compute_score({"bag": 30})
        self.assertEqual(total, 30)
        self.assertEqual(score, 90)
        self.assertEqual(severity, "Severe")

    def test_unknown_waste_category_fallback(self):
        # unknown_item uses default weight 1.0
        total, score, severity = compute_score({"plastic_chair": 5})
        self.assertEqual(total, 5)
        self.assertEqual(score, 5)
        self.assertEqual(severity, "Low")


class TestFastAPIEndpoints(unittest.TestCase):
    def test_health_endpoint(self):
        res = health()
        self.assertEqual(res.status, "ok")
        self.assertIn(res.device, ["cuda", "mps", "cpu"])
        self.assertIsInstance(res.loaded_models, list)

    def test_models_endpoint(self):
        res = list_models()
        self.assertEqual(len(res.models), len(MODELS_CONFIG))
        model_ids = [m.id for m in res.models]
        self.assertIn("yolov11m", model_ids)
        self.assertIn("yolov26s", model_ids)


if __name__ == "__main__":
    unittest.main()
