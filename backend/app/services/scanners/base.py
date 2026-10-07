"""Base Scanner Adapter Interface for MediShield Defensive Assessment Tools."""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class ScannerFinding:
    title: str
    description: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    category: str  # NETWORK, PORT, SSL/TLS, VULNERABILITY, PROTOCOL, CONFIGURATION
    cve_id: Optional[str] = None
    cvss_score: Optional[float] = None
    affected_port: Optional[int] = None
    affected_service: Optional[str] = None
    remediation_guidance: Optional[str] = None
    raw_evidence: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ScannerResult:
    tool_name: str
    status: str  # SUCCESS, FAILED, UNAVAILABLE, SIMULATED
    target_ip: str
    available: bool
    execution_time_seconds: float
    findings: List[ScannerFinding] = field(default_factory=list)
    raw_output: str = ""
    error_message: Optional[str] = None
    is_simulated: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


class BaseScannerAdapter(ABC):
    """Abstract base class for all defensive tool integrations."""

    tool_name: str = "base"
    version: str = "1.0.0"

    @abstractmethod
    def check_availability(self) -> Dict[str, Any]:
        """Checks whether the external binary or API service is configured and accessible."""
        pass

    @abstractmethod
    def execute(self, target_ip: str, device_context: Dict[str, Any], options: Optional[Dict[str, Any]] = None) -> ScannerResult:
        """Executes a strictly bounded defensive assessment against the registered target."""
        pass
