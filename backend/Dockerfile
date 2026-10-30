FROM python:3.11-slim

# Install system utilities, networking libraries, and defensive CLI scanner tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap \
    tshark \
    curl \
    ca-certificates \
    libcap2-bin \
    procps \
    git \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Nuclei (ProjectDiscovery Linux AMD64)
RUN curl -sL https://github.com/projectdiscovery/nuclei/releases/download/v3.1.10/nuclei_3.1.10_linux_amd64.zip -o /tmp/nuclei.zip \
    && unzip -q /tmp/nuclei.zip -d /usr/local/bin/ nuclei \
    && chmod +x /usr/local/bin/nuclei \
    && rm -f /tmp/nuclei.zip

# Install Syft (Anchore SBOM Generator)
RUN curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Set permissions for non-root / secure execution
ENV PORT=8000
ENV HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
