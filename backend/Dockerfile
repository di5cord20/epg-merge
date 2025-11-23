# EPG Merge Backend - Optimized Multi-stage Build (v0.4.7)
# Reduces image size from ~500MB to ~250MB

# Stage 1: Builder - Install dependencies
FROM python:3.11-slim as builder

WORKDIR /app

# Install only what's needed for building
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies to a venv
COPY backend/requirements.txt .
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime - Minimal final image
FROM python:3.11-slim

WORKDIR /app

# Only install runtime dependencies (no build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy venv from builder (already contains all dependencies)
COPY --from=builder /opt/venv /opt/venv

# Copy application code
COPY backend/ .

# Set up non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Set environment
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Note: /config directory is created by docker-compose volume mount
# No need to create it here

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:9193/api/health || exit 1

# Run application
EXPOSE 9193
CMD ["python", "main.py"]