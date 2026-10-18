# ==============================================================================
# Modern Dockerfile for chinese-dos-games-web (Community Edition)
# Maintainer: GotBearHeart
# Features: Multi-arch (amd64/arm64), Cloud Saves, CRT Filter, Poster Wall
# ==============================================================================

FROM python:3.11-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=262 \
    WORKERS=4

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Prepare directories for volumes
RUN mkdir -p /app/saves /app/static/games/bin /app/static/games/img

EXPOSE 262

VOLUME ["/app/saves", "/app/static/games/bin", "/app/static/games/img"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/ || exit 1

CMD ["sh", "-c", "gunicorn -w ${WORKERS} -b 0.0.0.0:${PORT} --access-logfile - --error-logfile - app:app"]
