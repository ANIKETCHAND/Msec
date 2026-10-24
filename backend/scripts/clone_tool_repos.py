import os
import subprocess
import sys
import time

TOOLS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tools")
os.makedirs(TOOLS_DIR, exist_ok=True)

REPOS = {
    "nikto": "https://github.com/sullo/nikto.git",
    "nuclei": "https://github.com/projectdiscovery/nuclei.git",
    "trivy": "https://github.com/aquasecurity/trivy.git",
    "syft": "https://github.com/anchore/syft.git",
    "zap": "https://github.com/zaproxy/zaproxy.git",
    "wireshark": "https://github.com/wireshark/wireshark.git",
    "suricata": "https://github.com/OISF/suricata.git",
    "zeek": "https://github.com/zeek/zeek.git",
    "lynis": "https://github.com/CISOfy/lynis.git",
    "openscap": "https://github.com/OpenSCAP/openscap.git",
    "openvas": "https://github.com/greenbone/openvas-scanner.git",
    "nmap": "https://github.com/nmap/nmap.git"
}

print(f"=== Cloning tool repositories into {TOOLS_DIR} ===", flush=True)

for name, url in REPOS.items():
    dest = os.path.join(TOOLS_DIR, name)
    if os.path.isdir(dest):
        print(f"[EXISTS] {name} already exists at {dest}", flush=True)
        continue
    print(f"[*] Cloning {name} from {url}...", flush=True)
    try:
        start = time.time()
        res = subprocess.run(
            ["git", "clone", "--depth", "1", url, dest],
            capture_output=True,
            text=True,
            timeout=300
        )
        if res.returncode == 0:
            print(f"[OK] Successfully cloned {name} in {time.time() - start:.1f}s", flush=True)
        else:
            print(f"[WARN] git clone {name} returned {res.returncode}: {res.stderr[:200]}", flush=True)
    except Exception as e:
        print(f"[ERROR] Error cloning {name}: {e}", flush=True)

print("=== All requested tool repositories processed ===", flush=True)
