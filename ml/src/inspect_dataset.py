"""CICIoMT2024 Dataset Inspector.

This script scans the `ml/data/` directory for genuine CICIoMT2024 dataset files,
inspects feature columns, samples, data types, and reports missing values and label distributions.
"""

import sys
from pathlib import Path
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def inspect_dataset() -> None:
    """Inspects dataset files present in ml/data."""
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

    target_file = csv_files[0]
    print(f"\n[*] Inspecting sample file: {target_file.name}")
    try:
        df = pd.read_csv(target_file, nrows=1000)
        print(f"    Sample Rows: {len(df)}")
        print(f"    Total Columns: {len(df.columns)}")
        print(f"    Columns:\n    {list(df.columns)}")
        print("\n[*] Data Types Summary:")
        print(df.dtypes.value_counts())
        print("\n[*] Missing Values Check:")
        missing = df.isnull().sum()
        print(missing[missing > 0] if missing.sum() > 0 else "    No missing values in initial sample.")
    except Exception as exc:
        print(f"[!] Error reading {target_file.name}: {exc}")


if __name__ == "__main__":
    inspect_dataset()
