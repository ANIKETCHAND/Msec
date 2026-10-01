"""Evaluation Script for Trained CICIoMT2024 Intrusion Detection Model.

Computes actual Accuracy, Precision, Recall, F1, Per-class breakdown, Confusion Matrix,
and False Positive Rates on held-out test devices (zero leakage).
"""

from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"
REPORTS_DIR = Path(__file__).resolve().parent.parent / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def evaluate():
    """Evaluates model performance on the held-out test split."""
    print("[*] Loading test data and trained model bundle...")
    X_test = np.load(ARTIFACTS_DIR / "X_test.npy")
    y_test = np.load(ARTIFACTS_DIR / "y_test.npy")
    model_bundle = joblib.load(ARTIFACTS_DIR / "iomt_rf_model.joblib")

    rf_clf = model_bundle["rf_classifier"]
    classes = model_bundle["classes"]

    # Predict on test set
    y_pred = rf_clf.predict(X_test)
    y_proba = rf_clf.predict_proba(X_test)

    # Calculate actual metrics
    acc = float(accuracy_score(y_test, y_pred))
    prec_macro = float(precision_score(y_test, y_pred, average="macro"))
    rec_macro = float(recall_score(y_test, y_pred, average="macro"))
    f1_macro = float(f1_score(y_test, y_pred, average="macro"))

    prec_weighted = float(precision_score(y_test, y_pred, average="weighted"))
    rec_weighted = float(recall_score(y_test, y_pred, average="weighted"))
    f1_weighted = float(f1_score(y_test, y_pred, average="weighted"))

    cm = confusion_matrix(y_test, y_pred).tolist()
    clf_rep = classification_report(y_test, y_pred, target_names=classes, output_dict=True)

    # Compute False Positive Rate for Benign class (Normal traffic classified as Attack)
    benign_idx = classes.index("Benign") if "Benign" in classes else 0
    total_benign = int(np.sum(y_test == benign_idx))
    false_positives = int(np.sum((y_test == benign_idx) & (y_pred != benign_idx)))
    fpr = float(false_positives / total_benign) if total_benign > 0 else 0.0

    report_data = {
        "model_name": model_bundle["model_name"],
        "version": model_bundle["version"],
        "dataset": model_bundle["dataset"],
        "test_samples": len(y_test),
        "overall_metrics": {
            "accuracy": round(acc, 4),
            "macro_precision": round(prec_macro, 4),
            "macro_recall": round(rec_macro, 4),
            "macro_f1": round(f1_macro, 4),
            "weighted_precision": round(prec_weighted, 4),
            "weighted_recall": round(rec_weighted, 4),
            "weighted_f1": round(f1_weighted, 4),
            "benign_false_positive_rate": round(fpr, 4)
        },
        "per_class_metrics": {cls: clf_rep[cls] for cls in classes},
        "confusion_matrix": {
            "labels": classes,
            "matrix": cm
        },
        "classes": classes
    }

    # Save JSON report
    report_json_path = REPORTS_DIR / "evaluation_report.json"
    with open(report_json_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)
    print(f"[OK] Saved JSON evaluation metrics to: {report_json_path}")

    # Print summary
    print("\n========================================================")
    print("GENUINE EVALUATION RESULTS ON HELD-OUT TEST DEVICES")
    print("========================================================")
    print(f"Accuracy:          {acc:.2%}")
    print(f"Macro F1-Score:    {f1_macro:.4f}")
    print(f"Weighted F1-Score: {f1_weighted:.4f}")
    print(f"Benign FPR:        {fpr:.2%}")
    print("\nPer-Class Breakdown:")
    for cls in classes:
        metrics = clf_rep[cls]
        print(f"  - {cls:<16}: Precision={metrics['precision']:.3f}, Recall={metrics['recall']:.3f}, F1={metrics['f1-score']:.3f} (Support: {metrics['support']})")

    print("\nConfusion Matrix:")
    cm_df = pd.DataFrame(cm, index=[f"Actual {c}" for c in classes], columns=[f"Pred {c}" for c in classes])
    print(cm_df)

    return report_data


if __name__ == "__main__":
    evaluate()
