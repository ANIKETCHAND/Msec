"""Automated Setup Script for MediShield Defensive Tools.

Downloads and configures portable Windows binaries for:
- Nmap Service Scanner (v7.92 portable)
- Nuclei CVE & Template Engine (latest)
- Trivy Software & Firmware Auditor (latest)
- Syft SBOM Generator (latest)
- Nikto Web Auditor (git clone)
"""

import os
import io
import shutil
import zipfile
import subprocess
import httpx

TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
BIN_DIR = os.path.join(TOOLS_DIR, "bin")
os.makedirs(BIN_DIR, exist_ok=True)


def download_nuclei():
    dest = os.path.join(BIN_DIR, "nuclei.exe")
    if os.path.isfile(dest):
        print("[✓] Nuclei already installed.")
        return
    print("[*] Downloading Nuclei from GitHub releases...")
    r_tag = httpx.get("https://github.com/projectdiscovery/nuclei/releases/latest", follow_redirects=False)
    tag = r_tag.headers.get("location", "").split("/")[-1]
    url = f"https://github.com/projectdiscovery/nuclei/releases/download/{tag}/nuclei_{tag[1:]}_windows_amd64.zip"
    resp = httpx.get(url, follow_redirects=True, timeout=120.0)
    z = zipfile.ZipFile(io.BytesIO(resp.content))
    z.extract("nuclei.exe", BIN_DIR)
    print("[✓] Nuclei installed successfully.")


def download_trivy():
    dest = os.path.join(BIN_DIR, "trivy.exe")
    if os.path.isfile(dest):
        print("[✓] Trivy already installed.")
        return
    print("[*] Downloading Trivy from GitHub releases...")
    r_tag = httpx.get("https://github.com/aquasecurity/trivy/releases/latest", follow_redirects=False)
    tag = r_tag.headers.get("location", "").split("/")[-1]
    url = f"https://github.com/aquasecurity/trivy/releases/download/{tag}/trivy_{tag[1:]}_windows-64bit.zip"
    resp = httpx.get(url, follow_redirects=True, timeout=120.0)
    z = zipfile.ZipFile(io.BytesIO(resp.content))
    z.extract("trivy.exe", BIN_DIR)
    print("[✓] Trivy installed successfully.")


def download_syft():
    dest = os.path.join(BIN_DIR, "syft.exe")
    if os.path.isfile(dest):
        print("[✓] Syft already installed.")
        return
    print("[*] Downloading Syft from GitHub releases...")
    r_tag = httpx.get("https://github.com/anchore/syft/releases/latest", follow_redirects=False)
    tag = r_tag.headers.get("location", "").split("/")[-1]
    url = f"https://github.com/anchore/syft/releases/download/{tag}/syft_{tag[1:]}_windows_amd64.zip"
    resp = httpx.get(url, follow_redirects=True, timeout=120.0)
    z = zipfile.ZipFile(io.BytesIO(resp.content))
    z.extract("syft.exe", BIN_DIR)
    print("[✓] Syft installed successfully.")


def download_nmap():
    dest = os.path.join(BIN_DIR, "nmap.exe")
    if os.path.isfile(dest):
        print("[✓] Nmap already installed.")
        return
    print("[*] Downloading Portable Nmap v7.92...")
    url = "https://nmap.org/dist/nmap-7.92-win32.zip"
    resp = httpx.get(url, follow_redirects=True, timeout=120.0)
    z = zipfile.ZipFile(io.BytesIO(resp.content))
    tmp_dir = os.path.join(TOOLS_DIR, "_nmap_tmp")
    z.extractall(tmp_dir)
    extracted_folder = os.path.join(tmp_dir, "nmap-7.92")
    for item in os.listdir(extracted_folder):
        s = os.path.join(extracted_folder, item)
        d = os.path.join(BIN_DIR, item)
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)
        else:
            shutil.copy2(s, d)
    shutil.rmtree(tmp_dir, ignore_errors=True)
    print("[✓] Nmap installed successfully.")


def clone_nikto():
    dest = os.path.join(TOOLS_DIR, "nikto")
    if os.path.isdir(dest):
        print("[✓] Nikto repository already cloned.")
        return
    print("[*] Cloning Nikto repository...")
    subprocess.run(["git", "clone", "--depth", "1", "https://github.com/sullo/nikto.git", dest], check=True)
    print("[✓] Nikto cloned successfully.")


if __name__ == "__main__":
    print("=== MediShield Defensive Tools Setup ===")
    download_nuclei()
    download_nmap()
    download_trivy()
    download_syft()
    clone_nikto()
    print("=== All tools ready in backend/tools/bin ===")
