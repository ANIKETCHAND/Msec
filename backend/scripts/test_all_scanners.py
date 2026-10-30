import sys
import os

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)

from app.services.scanners.orchestrator import orchestrator

device_ctx = {
    "id": "DEV-TEST-001",
    "name": "Test Medical Device",
    "device_type": "Patient Monitor",
    "manufacturer": "Philips Healthcare",
    "model": "IntelliVue MX800",
    "ip_address": "127.0.0.1",
    "network_segment": "ICU_VLAN_10"
}

print(f"Testing all {len(orchestrator.adapters)} scanner adapters individually against 127.0.0.1...")
all_passed = True
for name, adapter in orchestrator.adapters.items():
    try:
        avail = adapter.check_availability()
        res = adapter.execute(target_ip="127.0.0.1", device_context=device_ctx)
        err = (res.error_message[:50] + "...") if res.error_message and len(res.error_message) > 50 else (res.error_message or "None")
        print(f"  [ADAPTER {name:15}] Status: {res.status:16} | Avail: {str(res.available):5} | Findings: {len(res.findings):2} | Time: {res.execution_time_seconds:5.2f}s | Err: {err}")
    except Exception as e:
        all_passed = False
        print(f"  [ADAPTER {name:15}] CRASHED: {type(e).__name__}: {e}")

if all_passed:
    print("\nSUCCESS: All 14 adapters executed safely without crashing!")
else:
    print("\nFAILURE: One or more adapters crashed.")
