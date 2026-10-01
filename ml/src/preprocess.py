"""Preprocessing Pipeline for CICIoMT2024 IoMT Dataset.

Responsible for feature validation, handling missing values, standardizing features
strictly on training data, and group-aware splitting to prevent cross-device leakage.
"""

from pathlib import Path
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import StandardScaler, LabelEncoder

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)


def preprocess_data(data_path: Path = None):
    """Executes leakage-free preprocessing pipeline."""
    if data_path is None:
        csv_files = sorted(list(DATA_DIR.glob("*.csv")), key=lambda x: x.stat().st_size, reverse=True)
        if not csv_files:
            raise FileNotFoundError(f"No CSV files found in {DATA_DIR}")
        data_path = csv_files[0]

    print(f"[*] Reading dataset from: {data_path.name}")
    df = pd.read_csv(data_path)

    # 1. Identify target and group columns
    target_col = "label"
    group_col = "device_group" if "device_group" in df.columns else None

    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found in dataset.")

    y = df[target_col]

    # Exclude non-feature and target columns
    cols_to_drop = [target_col]
    if group_col:
        groups = df[group_col]
        cols_to_drop.append(group_col)
    else:
        groups = None

    # Exclude potential leakage columns
    leakage_indicators = ["timestamp", "time", "date", "ip", "src_ip", "dst_ip", "mac", "session_id"]
    for col in df.columns:
        if any(ind in col.lower() for ind in leakage_indicators):
            cols_to_drop.append(col)

    X = df.drop(columns=list(set(cols_to_drop)))

    print(f"[*] Features selected for training ({len(X.columns)} features):")
    print(f"    {list(X.columns)}")

    # 2. Train / Test Split (Group-aware if groups exist to prevent cross-device leakage)
    if groups is not None and len(groups.unique()) > 1:
        print(f"[*] Performing Group-Aware Split across devices: {list(groups.unique())}")
        gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
        train_idx, test_idx = next(gss.split(X, y, groups=groups))
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
        print(f"    Train devices: {list(groups.iloc[train_idx].unique())}")
        print(f"    Test devices:  {list(groups.iloc[test_idx].unique())} (Isolated)")
    else:
        from sklearn.model_selection import train_test_split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)

    print(f"[*] Split Sizes: Train={len(X_train)}, Test={len(X_test)}")

    # 3. Handle Missing Values (Impute with train median only)
    medians = X_train.median()
    X_train = X_train.fillna(medians)
    X_test = X_test.fillna(medians)

    # 4. Standard Scaling (Fit strictly on X_train to prevent test leakage)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 5. Label Encoding
    label_encoder = LabelEncoder()
    y_train_encoded = label_encoder.fit_transform(y_train)
    y_test_encoded = label_encoder.transform(y_test)

    preprocessor_bundle = {
        "feature_names": list(X.columns),
        "scaler": scaler,
        "medians": medians,
        "label_encoder": label_encoder,
        "classes": list(label_encoder.classes_)
    }

    out_bundle_path = ARTIFACTS_DIR / "preprocessor.joblib"
    joblib.dump(preprocessor_bundle, out_bundle_path)
    print(f"[OK] Saved preprocessing pipeline to: {out_bundle_path}")

    # Save split datasets
    np.save(ARTIFACTS_DIR / "X_train.npy", X_train_scaled)
    np.save(ARTIFACTS_DIR / "X_test.npy", X_test_scaled)
    np.save(ARTIFACTS_DIR / "y_train.npy", y_train_encoded)
    np.save(ARTIFACTS_DIR / "y_test.npy", y_test_encoded)
    print(f"[OK] Saved training and test splits to {ARTIFACTS_DIR}")

    return X_train_scaled, X_test_scaled, y_train_encoded, y_test_encoded, preprocessor_bundle


if __name__ == "__main__":
    preprocess_data()
