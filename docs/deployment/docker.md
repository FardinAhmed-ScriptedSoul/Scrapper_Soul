# Docker Compose Deployment

## Services

`compose.yaml` defines four containers:

- **frontend** — Vite production build served by Nginx on `http://localhost:8080`.
- **backend** — Node.js API and Python scraper runtime on `http://localhost:3000`.
- **mongo** — MongoDB 7 with persistent `mongodb_data`.
- **redis** — Redis 7 with append-only persistence in `redis_data`.

The backend waits for healthy MongoDB and Redis services. MongoDB and Redis ports are bound to `127.0.0.1`; do not change these bindings for an untrusted public host.

## Configure and run

Create `backend/.env` from `backend/.env.example`. Set a strong `JWT_SECRET` and valid `EMAIL_USER`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `REFRESH_TOKEN` values. Those existing application settings are required at startup. Compose overrides `MONGODB_URI` and `REDIS_URL` inside the backend container to use the local services, so Atlas/Upstash URLs in the env file are not used by this stack.

From the repository root:

```powershell
Copy-Item backend\.env.example backend\.env
# Edit backend\.env before starting.
docker compose up --build
```

The frontend is available at `http://localhost:8080`; `http://localhost:3000/health` checks the API. Use `docker compose logs -f backend` to inspect backend startup and scraper output.

All published ports bind to localhost. If a default port is already in use, override the host port variables before starting Compose:

```powershell
$env:MONGO_HOST_PORT = '27018'
$env:REDIS_HOST_PORT = '6380'
$env:BACKEND_HOST_PORT = '3001'
$env:FRONTEND_HOST_PORT = '8082'
$env:VITE_API_BASE_URL = 'http://localhost:3001/api/v1'
$env:FRONTEND_ORIGIN = 'http://localhost:8082'
docker compose up --build
```

Changing the frontend or backend host port requires matching `VITE_API_BASE_URL` and `FRONTEND_ORIGIN` values as shown.

The frontend API base URL is embedded at image build time. For a different browser-visible API address:

```powershell
$env:VITE_API_BASE_URL = 'https://api.example.com/api/v1'
$env:FRONTEND_ORIGIN = 'https://app.example.com'
docker compose build frontend backend
docker compose up
```

Configure TLS and a reverse proxy before deploying beyond local development. Do not commit environment files.

## Persistence and cleanup

`docker compose down` stops and removes containers but keeps both named data volumes. `docker compose down --volumes` also deletes MongoDB and Redis data and should only be used when intentionally resetting the local databases.

## Build validation

Validate Compose configuration with `docker compose config --quiet` and build all images with `docker compose build`. These commands do not start services or contact the configured application providers.
