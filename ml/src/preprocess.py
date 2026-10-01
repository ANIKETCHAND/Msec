"""Preprocessing Pipeline for CICIoMT2024 IoMT Dataset.

Responsible for feature extraction, handling missing data, encoding attack labels,
and splitting datasets without cross-device leakage.
"""

from pathlib import Path

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"


def run_pipeline() -> None:
    """Run data preprocessing pipeline."""
    print("[*] Preprocessing pipeline will be configured in Phase 6.")


if __name__ == "__main__":
    run_pipeline()
