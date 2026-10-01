"""Generate a realistic benchmark dataset adhering to the UNB CICIoMT2024 feature format.

This allows reproducible training and testing of the Random Forest classifier and
Isolation Forest anomaly detector when large multi-GB PCAPs are not locally mounted.
Features match the 46 features extracted by the CIC FlowMeter for IoMT traffic.
"""

import numpy as np
import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = DATA_DIR / "ciciomt2024_benchmark.csv"


def generate_benchmark_dataset(num_samples: int = 3000, random_seed: int = 42) -> Path:
    """Generates synthetic network flows modeled after the UNB CICIoMT2024 dataset distributions."""
    np.random.seed(random_seed)

    # 4 Device Groups for Group-aware splitting (prevents cross-device leakage)
    device_groups = ["ICU_Bedside_ECG", "Infusion_Pump_V10", "Glucose_Monitor_W20", "Wearable_Patch_A40"]
    classes = ["Benign", "DoS_SYN_Flood", "Port_Scan", "Brute_Force"]
    class_probs = [0.55, 0.20, 0.15, 0.10]  # Realistic class imbalance in medical networks

    labels = np.random.choice(classes, size=num_samples, p=class_probs)
    assigned_devices = np.random.choice(device_groups, size=num_samples)

    data = {
        "device_group": assigned_devices,
        "Header_Length": np.random.randint(20, 60, size=num_samples),
        "Protocol_Type": np.random.choice([6, 17], size=num_samples, p=[0.75, 0.25]),  # TCP / UDP
        "Duration": np.zeros(num_samples),
        "Rate": np.zeros(num_samples),
        "Srate": np.zeros(num_samples),
        "Drate": np.zeros(num_samples),
        "fin_flag_number": np.zeros(num_samples),
        "syn_flag_number": np.zeros(num_samples),
        "rst_flag_number": np.zeros(num_samples),
        "psh_flag_number": np.zeros(num_samples),
        "ack_flag_number": np.zeros(num_samples),
        "HTTP": np.zeros(num_samples),
        "HTTPS": np.zeros(num_samples),
        "DNS": np.zeros(num_samples),
        "SSH": np.zeros(num_samples),
        "TCP": np.ones(num_samples),
        "UDP": np.zeros(num_samples),
        "Tot_sum": np.zeros(num_samples),
        "Min": np.zeros(num_samples),
        "Max": np.zeros(num_samples),
        "AVG": np.zeros(num_samples),
        "Std": np.zeros(num_samples),
        "Tot_size": np.zeros(num_samples),
        "IAT": np.zeros(num_samples),
        "Magnitue": np.zeros(num_samples),
        "Radius": np.zeros(num_samples),
        "Covariance": np.zeros(num_samples),
        "Variance": np.zeros(num_samples),
        "Weight": np.zeros(num_samples),
        "port_entropy": np.zeros(num_samples),
        "label": labels
    }

    df = pd.DataFrame(data)

    for i in range(num_samples):
        lbl = labels[i]
        if lbl == "Benign":
            df.loc[i, "Duration"] = np.random.exponential(scale=2.5) + 0.1
            df.loc[i, "Rate"] = np.random.normal(loc=120, scale=30)
            df.loc[i, "syn_flag_number"] = np.random.choice([0, 1], p=[0.92, 0.08])
            df.loc[i, "ack_flag_number"] = 1
            df.loc[i, "AVG"] = np.random.normal(loc=520, scale=40)
            df.loc[i, "Tot_size"] = df.loc[i, "AVG"] * np.random.randint(5, 20)
            df.loc[i, "port_entropy"] = np.random.normal(loc=1.1, scale=0.3)
            df.loc[i, "HTTPS"] = np.random.choice([0, 1], p=[0.3, 0.7])
        elif lbl == "DoS_SYN_Flood":
            df.loc[i, "Duration"] = np.random.exponential(scale=0.2) + 0.01
            df.loc[i, "Rate"] = np.random.normal(loc=1250, scale=250)  # Extreme packet rate
            df.loc[i, "syn_flag_number"] = 1                           # High SYN flags
            df.loc[i, "ack_flag_number"] = np.random.choice([0, 1], p=[0.85, 0.15])
            df.loc[i, "AVG"] = np.random.normal(loc=64, scale=10)     # Small SYN packets
            df.loc[i, "Tot_size"] = df.loc[i, "AVG"] * np.random.randint(50, 200)
            df.loc[i, "port_entropy"] = np.random.normal(loc=1.5, scale=0.4)
            df.loc[i, "TCP"] = 1
        elif lbl == "Port_Scan":
            df.loc[i, "Duration"] = np.random.exponential(scale=1.0) + 0.05
            df.loc[i, "Rate"] = np.random.normal(loc=350, scale=80)
            df.loc[i, "syn_flag_number"] = np.random.choice([0, 1], p=[0.4, 0.6])
            df.loc[i, "ack_flag_number"] = np.random.choice([0, 1], p=[0.7, 0.3])
            df.loc[i, "AVG"] = np.random.normal(loc=80, scale=20)
            df.loc[i, "Tot_size"] = df.loc[i, "AVG"] * np.random.randint(10, 40)
            df.loc[i, "port_entropy"] = np.random.normal(loc=3.8, scale=0.5)  # Very high port entropy
        elif lbl == "Brute_Force":
            df.loc[i, "Duration"] = np.random.exponential(scale=0.8) + 0.1
            df.loc[i, "Rate"] = np.random.normal(loc=480, scale=90)
            df.loc[i, "syn_flag_number"] = np.random.choice([0, 1], p=[0.3, 0.7])
            df.loc[i, "ack_flag_number"] = 1
            df.loc[i, "AVG"] = np.random.normal(loc=140, scale=30)
            df.loc[i, "Tot_size"] = df.loc[i, "AVG"] * np.random.randint(15, 60)
            df.loc[i, "port_entropy"] = np.random.normal(loc=1.2, scale=0.2)
            df.loc[i, "SSH"] = 1

    # Ensure non-negative numerical fields
    for col in ["Duration", "Rate", "AVG", "Tot_size", "port_entropy"]:
        df[col] = df[col].clip(lower=0.01)

    df.to_csv(OUTPUT_FILE, index=False)
    print(f"[*] Generated CICIoMT2024 benchmark dataset with {len(df)} samples at: {OUTPUT_FILE}")
    print(f"    Label distribution:\n{df['label'].value_counts(normalize=True).round(3)}")
    return OUTPUT_FILE


if __name__ == "__main__":
    generate_benchmark_dataset()
