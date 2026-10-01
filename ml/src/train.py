"""Model Training for CICIoMT2024 Intrusion Detection.

Trains a Random Forest multi-class classifier and Isolation Forest anomaly detector
using reproducible parameters and group-split training data.
"""

from pathlib import Path
import json
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier, IsolationForest

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"
REPORTS_DIR = Path(__file__).resolve().parent.parent / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def train_models():
    """Trains Random Forest and Isolation Forest models."""
    print("[*] Loading preprocessed training splits...")
    X_train = np.load(ARTIFACTS_DIR / "X_train.npy")
    y_train = np.load(ARTIFACTS_DIR / "y_train.npy")
    preprocessor = joblib.load(ARTIFACTS_DIR / "preprocessor.joblib")
    classes = preprocessor["classes"]

    print(f"[*] Training dataset size: {X_train.shape[0]} samples, {X_train.shape[1]} features.")
    print(f"[*] Target classes: {classes}")

    # 1. Train Random Forest Classifier
    print("[*] Fitting Random Forest Classifier (n_estimators=100, max_depth=15)...")
    rf_clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1
    )
    rf_clf.fit(X_train, y_train)

    # 2. Train Isolation Forest (Anomaly Detector on Normal/Benign flows)
    benign_idx = classes.index("Benign") if "Benign" in classes else 0
    X_benign_train = X_train[y_train == benign_idx]

    print(f"[*] Fitting Isolation Forest on {len(X_benign_train)} Benign flows (contamination=0.08)...")
    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=0.08,
        random_state=42,
        n_jobs=-1
    )
    iso_forest.fit(X_benign_train)

    # 3. Model Bundle
    model_bundle = {
        "model_name": "MediShield Random Forest IoMT Classifier",
        "version": "1.0.0",
        "dataset": "UNB CICIoMT2024",
        "rf_classifier": rf_clf,
        "isolation_forest": iso_forest,
        "preprocessor": preprocessor,
        "feature_names": preprocessor["feature_names"],
        "classes": classes,
        "parameters": {
            "n_estimators": 100,
            "max_depth": 15,
            "class_weight": "balanced_subsample",
            "random_state": 42
        }
    }

    out_model_path = ARTIFACTS_DIR / "iomt_rf_model.joblib"
    joblib.dump(model_bundle, out_model_path)
    print(f"[OK] Trained model bundle saved to: {out_model_path}")

    return model_bundle


if __name__ == "__main__":
    train_models()
