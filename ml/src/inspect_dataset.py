"""CICIoMT2024 Dataset Inspection Script.

Scans the `ml/data/` directory for genuine CICIoMT2024 dataset files,
inspects feature columns, samples, data types, class imbalance, missing values,
and analyzes potential data leakage vectors (IPs, timestamps, session identifiers).
"""

import sys
from pathlib import Path
import pandas as pd
import numpy as np

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def inspect_dataset():
    """Inspects dataset files in ml/data."""
    csv_files = list(DATA_DIR.glob("*.csv"))

    if not csv_files:
        print("[!] No CSV dataset files found in:", DATA_DIR)
        print("    Please download the genuine CICIoMT2024 dataset from:")
        print("    https://www.unb.ca/cic/datasets/iomt-dataset-2024.html")
        print("    Place the extracted CSV files into ml/data/ and re-run this script.")
        return

    print(f"[*] Found {len(csv_files)} CSV files in {DATA_DIR}:")
    for f in csv_files:
        print(f"  - {f.name} ({f.stat().st_size / (1024*1024):.2f} MB)")

    target_file = sorted(csv_files, key=lambda x: x.stat().st_size, reverse=True)[0]
    print(f"\n========================================================")
    print(f"[*] Detailed Inspection of: {target_file.name}")
    print(f"========================================================")

    df = pd.read_csv(target_file)
    print(f"1. Total Records: {len(df)}")
    print(f"2. Total Feature Columns: {len(df.columns)}")
    print(f"3. Feature Names:\n   {list(df.columns)}")

    print(f"\n4. Data Types Summary:")
    print(df.dtypes.value_counts())

    print(f"\n5. Missing Values:")
    null_counts = df.isnull().sum()
    if null_counts.sum() == 0:
        print("   Zero null values detected across all columns.")
    else:
        print(null_counts[null_counts > 0])

    print(f"\n6. Duplicate Rows:")
    dup_count = df.duplicated().sum()
    print(f"   Duplicate rows found: {dup_count} ({(dup_count / len(df))*100:.2f}%)")

    print(f"\n7. Label Distribution & Class Imbalance:")
    if "label" in df.columns:
        counts = df["label"].value_counts()
        proportions = df["label"].value_counts(normalize=True) * 100
        summary = pd.DataFrame({"Count": counts, "Percentage (%)": proportions.round(2)})
        print(summary)
    else:
        print("   [!] No 'label' column found in dataset.")

    print(f"\n8. Leakage Risk Analysis:")
    leakage_indicators = ["timestamp", "time", "date", "ip", "src_ip", "dst_ip", "mac", "session_id"]
    flagged = [col for col in df.columns if any(ind in col.lower() for ind in leakage_indicators)]
    if flagged:
        print(f"   [!] Potential data leakage columns detected: {flagged}")
        print("       These must be excluded from feature vectors during training.")
    else:
        print("   [OK] No explicit timestamp or network identifier columns detected in feature matrix.")

    if "device_group" in df.columns:
        print(f"\n9. Device Group Distribution (for group-aware splitting):")
        print(df["device_group"].value_counts())


if __name__ == "__main__":
    inspect_dataset()
