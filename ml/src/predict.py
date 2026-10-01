"""Inference and Feature Validation Script for MediShield ML Model."""

from pathlib import Path
from typing import Dict, Any, Tuple
import joblib
import numpy as np

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "iomt_rf_model.joblib"


class Predictor:
    """Loads trained model bundle and performs feature inference."""

    def __init__(self, model_path: Path = MODEL_PATH):
        if not model_path.exists():
            raise FileNotFoundError(f"Model artifact not found at: {model_path}")
        self.bundle = joblib.load(model_path)
        self.rf_clf = self.bundle["rf_classifier"]
        self.preprocessor = self.bundle["preprocessor"]
        self.scaler = self.preprocessor["scaler"]
        self.medians = self.preprocessor["medians"]
        self.classes = self.bundle["classes"]
        self.feature_names = self.bundle["feature_names"]

    def predict(self, sample_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates incoming features, imputes missing with train medians, scales,
        and returns prediction with confidence.
        """
        # Vectorize sample according to feature_names order
        vector = []
        for name in self.feature_names:
            val = sample_dict.get(name, self.medians.get(name, 0.0))
            vector.append(float(val))

        X = np.array([vector])
        X_scaled = self.scaler.transform(X)

        pred_idx = self.rf_clf.predict(X_scaled)[0]
        probas = self.rf_clf.predict_proba(X_scaled)[0]
        confidence = float(probas[pred_idx])
        predicted_class = self.classes[pred_idx]

        is_anomaly = predicted_class != "Benign"

        return {
            "predicted_class": predicted_class,
            "confidence": round(confidence, 4),
            "is_anomaly": is_anomaly,
            "probabilities": {cls: round(float(p), 4) for cls, p in zip(self.classes, probas)},
            "model_version": self.bundle.get("version", "1.0.0")
        }


def test_predict():
    p = Predictor()
    # Test Benign sample
    sample_normal = {"Rate": 120.0, "syn_flag_number": 0, "port_entropy": 1.1, "AVG": 520.0}
    res_normal = p.predict(sample_normal)
    print(f"[*] Normal sample test: {res_normal['predicted_class']} (confidence: {res_normal['confidence']:.2%})")

    # Test DoS sample
    sample_dos = {"Rate": 1500.0, "syn_flag_number": 1, "port_entropy": 1.5, "AVG": 64.0}
    res_dos = p.predict(sample_dos)
    print(f"[*] DoS sample test:    {res_dos['predicted_class']} (confidence: {res_dos['confidence']:.2%})")


if __name__ == "__main__":
    test_predict()
