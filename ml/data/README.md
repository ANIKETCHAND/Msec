# CICIoMT2024 Dataset Directory

This directory is designated for the **CICIoMT2024** (Canadian Institute for Cybersecurity IoMT Dataset 2024).

- **Official Source**: [University of New Brunswick CICIoMT2024](https://www.unb.ca/cic/datasets/iomt-dataset-2024.html)
- **Publication**: Canadian Institute for Cybersecurity (CIC), 2024.
- **Dataset Focus**: Real-world IoMT network traffic across medical devices (patient monitors, infusion pumps, blood pressure cuffs) subjected to 16 attack classes (DDoS, DoS, Recon, MITM, Spoofing, MQTT attacks).

---

## Setup Instructions

1. Download the feature-extracted CSV files from the official UNB repository.
2. Place the CSV files in this directory (`ml/data/`).
3. Standard structure expected by the MediShield ML pipeline:
   ```text
   ml/data/
   ├── CICIoMT2024_sample.csv  (or full partition files)
   └── README.md
   ```
4. **Data Protection Note**: Raw CSV files and packet captures are automatically ignored by `.gitignore` to prevent committing heavy binary/traffic data to source control.
5. In Phase 6, `ml/src/inspect_dataset.py` will inspect and validate the columns, label distributions, and missing values of the downloaded files.
