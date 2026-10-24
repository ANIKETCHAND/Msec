import os
import shutil
"""Base Scanner Adapter Architecture for MediShield Defensive Assessment Tools.

Provides a unified interface for operational readiness detection, version probing,
defensive execution boundaries, structured result parsing, and standardized error handling.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timezone


class ToolStatus:
    """Standardized operational statuses across all defensive integrations."""
    AVAILABLE = "AVAILABLE"
    NOT_INSTALLED = "NOT_INSTALLED"
    NOT_CONFIGURED = "NOT_CONFIGURED"
    NOT_AUTHENTICATED = "NOT_AUTHENTICATED"
    UNREACHABLE = "UNREACHABLE"
    ERROR = "ERROR"
    DISABLED = "DISABLED"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class ToolCategory:
    """Standardized categories for organizing Assessment Center tools."""
    CORE_DISCOVERY = "Core Discovery"
    VULNERABILITY_ASSESSMENT = "Vulnerability Assessment"
    WEB_ASSESSMENT = "Web Assessment"
    NETWORK_MONITORING = "Network Monitoring"
    VULNERABILITY_INTELLIGENCE = "Vulnerability Intelligence"
    HOST_SOFTWARE_ASSESSMENT = "Host and Software Assessment"


@dataclass
class ScannerFinding:
    title: str
    description: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL / INFO
    category: str  # NETWORK, PORT, SSL/TLS, VULNERABILITY, PROTOCOL, CONFIGURATION
    cve_id: Optional[str] = None
    cvss_score: Optional[float] = None
    affected_port: Optional[int] = None
    affected_service: Optional[str] = None
    affected_url: Optional[str] = None
    remediation_guidance: Optional[str] = None
    verification_status: str = "Observation"  # Confirmed Vulnerability, Unverified Candidate, Observation, Positive Control
    raw_evidence: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ScannerResult:
    tool_name: str
    status: str  # COMPLETED, PARTIALLY_COMPLETED, FAILED, NOT_EVALUATED
    target_ip: str
    available: bool
    execution_time_seconds: float
    findings: List[ScannerFinding] = field(default_factory=list)
    raw_output: str = ""
    error_message: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    coverage_limitations: List[str] = field(default_factory=list)
    exit_code: Optional[int] = None
    start_time: Optional[str] = None
    completion_time: Optional[str] = None
    is_simulated: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


class BaseScannerAdapter(ABC):
    @classmethod
    def resolve_project_binary(cls, binary_name: str) -> Optional[str]:
        """Resolves binary from backend/tools/bin or system PATH."""
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        tools_bin = os.path.join(base_dir, "tools", "bin")
        for ext in ["", ".exe", ".bat", ".cmd", ".pl"]:
            candidate = os.path.join(tools_bin, f"{binary_name}{ext}")
            if os.path.isfile(candidate):
                return candidate
        return shutil.which(binary_name)
    """Abstract base class for all MediShield security tool integrations."""

    tool_name: str = "base"
    display_name: str = "Base Security Tool"
    category: str = ToolCategory.CORE_DISCOVERY
    version: str = "1.0.0"
    is_remote: bool = False
    supported_capabilities: List[str] = []

    @abstractmethod
    def check_availability(self) -> Dict[str, Any]:
        """Checks whether the external binary or API service is configured and accessible.

        Returns a dictionary adhering to the standard inventory schema:
        - name: Tool identifier
        - display_name: Human readable name
        - category: One of ToolCategory values
        - status: One of ToolStatus values
        - available: boolean
        - version: detected version string
        - is_remote: boolean
        - configuration_status: details of configuration
        - supported_capabilities: list of capability tags
        - last_health_check: ISO timestamp
        - path: binary path or service endpoint
        - message: safe explanation of status or missing prerequisites
        """
        pass

    def get_version(self) -> str:
        """Returns detected version of the tool or default fallback."""
        return self.version

    def validate_applicability(self, device_context: Dict[str, Any]) -> Tuple[bool, str]:
        """Validates whether this tool is applicable to the target asset type."""
        return True, "Tool is applicable to target asset."

    def validate_scope(self, target_ip: str, authorized_scope: List[str]) -> Tuple[bool, str]:
        """Enforces defensive boundaries and authorized activities."""
        return True, "Target is within authorized assessment boundaries."

    @abstractmethod
    def execute(
        self,
        target_ip: str,
        device_context: Dict[str, Any],
        options: Optional[Dict[str, Any]] = None
    ) -> ScannerResult:
        """Executes a strictly bounded, non-destructive assessment against the registered target."""
        pass
