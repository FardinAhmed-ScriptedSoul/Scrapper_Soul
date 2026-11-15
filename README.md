# Web Scraping Using Python

A local-first data collection application with a React dashboard, an Express API, MongoDB persistence, a Redis-backed job queue, and Python scraper processes.

Use the collection features only with sources and data you are authorized to access, and follow each source's terms and applicable law. Automated tests use local services and mocks; they do not contact target websites.

## Project layout

- `backend/` — Express API, MongoDB models and repositories, Redis/Bull queue, workers, and Jest tests.
- `frontend/` — React dashboard and shared API client.
- `python_scrapers/` — Python scraper entry points.
- `bot_detection_tests/` — standalone scripts; these are not part of the automated test suite.
- `docs/` — system design, architecture, and feature implementation notes.

See [System Design](docs/systemdesign.md), [System Architecture](docs/systemarchitecture.md), and the [feature notes](docs/implementation/).

## Saved results

The authenticated Results page browses records already stored for the signed-in user and shared news-feed entries. It supports text/source/date filters, chronological sorting, pagination, and CSV export of selected records. Browsing and exporting never starts a scrape.

Scraper records are scoped to their owner for saved-result queries, cache hits, and dashboard record counts. News feed entries are shared content. Historical scraper documents created before ownership was recorded are not displayed in a user's Results page because their owner cannot be verified.

The Notifications page provides opt-in email alerts for completed jobs and jobs that fail after all retries. Notifications are disabled by default; delivery failures are logged and do not change scrape job status.

The Presets page saves owner-scoped Amazon, Indeed, and Booking searches. Presets can be edited, deleted, queued on demand, and used to create supported Amazon/Indeed schedules. Booking presets require stay dates and can be queued as one-off jobs.

Feed Status lists the configured RSS, CoinGecko, and Nitter sources with their category mapping and latest actual sync outcome. Authenticated manual refresh is limited to one request per IP every 15 minutes.

## Requirements

- Node.js 20.19+ (or a compatible current LTS release)
- Python 3.10+
- MongoDB connection string
- Redis connection URL for Bull queue and scheduled jobs
- Mail OAuth settings for authentication email

## Configure the backend

Create `backend/.env` from [`backend/.env.example`](backend/.env.example), then set the values locally. The backend requires:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas or other MongoDB connection string |
| `REDIS_URL` | Redis TCP URL (use the provider's `rediss://` URL when TLS is required) |
| `JWT_SECRET` | Private signing secret for session tokens |
| `EMAIL_USER` | Sender mailbox |
| `GOOGLE_CLIENT_ID` | Mail OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Mail OAuth client secret |
| `REFRESH_TOKEN` | Mail OAuth refresh token |
| `PYTHON_EXECUTABLE` | Optional path to the Python executable; defaults to the project `venv` |
| `PORT` | Optional API port; defaults to `3000` |

The backend loads `.env` from its current working directory. To load a separate local credentials file first (for example `backend/atlas-credentials.env`) and then fill other settings from `.env`, set `DOTENV_CONFIG_PATH` while running from `backend/`:

```bash
# Git Bash
DOTENV_CONFIG_PATH=atlas-credentials.env npm run dev
```

```powershell
# PowerShell
$env:DOTENV_CONFIG_PATH = 'atlas-credentials.env'
npm run dev
```

Keep all real environment files out of version control. The repository ignores `*.env`; do not paste connection strings or secrets into issues or chat.

## Install and run

```bash
cd backend
npm ci
npm run dev
```

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

The frontend expects the API at `http://localhost:3000/api/v1` by default. Override it with `VITE_API_BASE_URL` when needed.

Python setup from the repository root:

```powershell
py -3.13 -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m playwright install chromium
```

If a scraper reports `No Python at ...`, the existing virtual environment points to a Python installation that was removed or moved. Recreate it with an installed Python version, then reinstall its dependencies:

```powershell
py -3.13 -m venv --clear venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m playwright install chromium
```

The backend defaults to `venv\Scripts\python.exe` on Windows. Set `PYTHON_EXECUTABLE` in `backend/.env` only if you use a different interpreter location. Virtual environments are machine-specific and should be recreated on a new machine.

## Run with Docker Compose

Docker Compose starts four services: the React frontend, Express/Python backend, MongoDB, and Redis. Create `backend/.env` from `backend/.env.example`, then set a strong `JWT_SECRET` and valid email OAuth values. Compose overrides `MONGODB_URI` and `REDIS_URL` inside the backend container so it uses the local MongoDB and Redis services.

From the repository root:

```powershell
Copy-Item backend\.env.example backend\.env
# Edit backend\.env and replace the JWT and email OAuth placeholders.
docker compose up --build
```

Open the frontend at `http://localhost:8080`; the API health endpoint is `http://localhost:3000/health`. MongoDB and Redis ports are published only on localhost. If a default host port is occupied, set `MONGO_HOST_PORT`, `REDIS_HOST_PORT`, `BACKEND_HOST_PORT`, or `FRONTEND_HOST_PORT` before starting Compose; when changing the API port, also set `VITE_API_BASE_URL` to the browser-visible API URL and rebuild the frontend. MongoDB and Redis data persist in named Docker volumes. `docker compose down` stops the services without deleting data; `docker compose down --volumes` also deletes the database and Redis volumes.

For a frontend hosted at a different browser-visible URL, set `VITE_API_BASE_URL` before building the frontend image and set `FRONTEND_ORIGIN` to that exact origin. Do not expose the database or Redis ports publicly.

## Tests and checks

Run backend tests from `backend/`:

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:e2e
```

The Jest setup starts an in-memory MongoDB instance. Unit tests cover isolated modules, integration tests exercise API routes and persistence, and the HTTP end-to-end test starts the server and requests its health endpoint. Redis, email, and scraper processes are mocked where appropriate; these tests do not verify external provider credentials.

Run frontend checks from `frontend/`:

```bash
npm run lint
npm run build
```

`python_scrapers/` currently has no dedicated automated test suite. Avoid running standalone scraper scripts as part of routine CI because they may make external network requests.

## Current limitations

- Proxy management, configurable retention, worker concurrency controls, and webhooks are not part of the current application; no controls are shown for them.
- The overview reports saved records, queue counts, queue completion rate, and host memory only. It does not collect bandwidth, CPU, or throttling data.
- Password reset currently stores a reset token but does not deliver a reset link.
- Tests use isolated services and do not prove that the configured Atlas, Redis, or mail provider is reachable.

See [Dashboard and Operations](docs/implementation/dashboard-operations.md), [Proxy Integration](docs/implementation/proxy-integration.md), and the [feature roadmap](docs/feature-roadmap.md).
