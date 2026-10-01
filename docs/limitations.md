# MediShield — Prototype Scope & Limitations Guide

## 1. Prototype Scope and Non-Certified Status
- **Academic Research Prototype**: MediShield is strictly an educational and academic research demonstration. It has not been submitted to the US FDA, EU CE Medical Device Regulation (MDR), or ISO 13485/IEC 62304 conformity assessments.
- **No Direct Clinical Hardware Connection**: The platform does not interface with actual physical patients or certified hospital infrastructure. All heart rate, glucose, SPO2, respiratory rate, and ventilator readings are synthetic mathematical models.

---

## 2. Simulated Device Activity vs. Live Hardware
- **Synthetic Signals**: Medical telemetry streams are simulated with realistic physiological noise. In production clinical environments, telemetry is subject to loose leads, sensor disconnects, patient movement artifacts, and proprietary HL7/FHIR message protocols.
- **Network Boundaries**: Simulation scenarios (such as DoS bandwidth floods or rogue device injection) execute strictly within synthetic application parameters and database records. They do not transmit packets to disrupt physical equipment.

---

## 3. Dataset Provenance & ML Generalization Risks
- **CICIoMT2024 Reference**: Machine learning models were trained on feature distributions established by the University of New Brunswick (UNB) CICIoMT2024 dataset.
- **Lab vs. Real-World Variance**: Network captures recorded in controlled cybersecurity testbeds often feature cleaner packet boundaries and higher signal-to-noise ratios than chaotic real-world hospital Wi-Fi networks with thousands of guest devices.
- **Probabilistic Nature of ML**: Model classifications are probabilistic predictions and must never be interpreted as certified proof of an attack. A high-confidence ML classification should trigger investigation by a qualified SOC analyst, rather than automated irreversible disconnection of life-critical devices.
- **Leakage Prevention**: To avoid cross-device data leakage, the pipeline enforces group-based splitting (`GroupShuffleSplit`), testing models on completely isolated device groups.

---

## 4. Cryptographic Key Management & Storage Boundaries
- **AES-256-GCM Nonce Handling**: The cryptographic service uses cryptographically strong 96-bit random nonces per encryption operation (`os.urandom(12)`). Nonces are never reused.
- **Key Storage Notice**: In this local prototype, keys are loaded from environment variables (`.env`). In high-assurance hospital systems, cryptographic keys must reside in a dedicated Hardware Security Module (HSM) or cloud KMS (AWS KMS, Azure Key Vault, Google Cloud KMS) with strict envelope encryption and hardware tamper resistance.
- **Hash Integrity Storage**: Storing SHA-256 digests in the same relational database table as mutable application data provides proof of accidental corruption and demonstration of tamper detection. However, it is not proof against an attacker who has gained full database administrator access and can overwrite both the data and the hash simultaneously (which in production requires immutable append-only ledgers or external blockchain anchoring).
