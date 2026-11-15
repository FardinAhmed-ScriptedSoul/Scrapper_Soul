FROM node:22-bookworm-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip python3-venv ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./
COPY requirements.txt /workspace/requirements.txt
COPY python_scrapers/ /workspace/python_scrapers/

RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r /workspace/requirements.txt \
    && /opt/venv/bin/playwright install --with-deps chromium

ENV PYTHON_EXECUTABLE=/opt/venv/bin/python
EXPOSE 3000

USER node
CMD ["node", "server.js"]
