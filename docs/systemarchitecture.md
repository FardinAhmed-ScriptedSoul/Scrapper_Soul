# System Architecture

## Context

```text
┌─────────────────────┐       HTTP / JSON       ┌────────────────────────┐
│ React frontend      │ ───────────────────────▶ │ Express API            │
│ pages + hooks       │ ◀─────────────────────── │ routes + middleware    │
└─────────────────────┘                           └───────────┬────────────┘
                                                            │
                            ┌───────────────────────────────┼──────────────────────────┐
                            ▼                               ▼                          ▼
                    ┌──────────────┐                ┌──────────────┐          ┌───────────────┐
                    │ Repositories │                │ Bull / Redis │          │ Python process│
                    │ Mongoose     │                │ queue        │          │ scraper jobs  │
                    └──────┬───────┘                └──────┬───────┘          └───────────────┘
                           ▼                               │
                    ┌──────────────┐                        └──────▶ scrape worker
                    │ MongoDB      │
                    └──────────────┘
```

## Backend layers

- **Entry point (`backend/server.js`)** — starts the exported server singleton and handles process shutdown signals.
- **Server lifecycle (`backend/src/server.js`)** — connects the database, initializes the scrape worker and scheduler, starts the feed pipeline, and owns the HTTP listener. Concurrent `start()` calls share one startup operation.
- **HTTP app (`backend/src/app.js`)** — configures Express middleware and mounts versioned routes.
- **Routes (`backend/src/routes/`)** — map HTTP endpoints to controllers and middleware.
- **Middleware (`backend/src/middleware/`)** — authentication, query validation, rate limiting, and activity recording.
- **Controllers (`backend/src/controllers/`)** — coordinate request-level behavior and response shapes.
- **Repositories (`backend/src/repositories/`)** — expose persistence operations; `MongooseRepository` is the MongoDB adapter.
- **Models (`backend/src/models/`)** — define Mongoose schemas, validation, indexes, and entity-level behavior.
- **Workers/schedulers (`backend/src/workers/`, `backend/src/schedulers/`)** — run feed synchronization, scrape jobs, and cron schedules.
- **External adapters (`backend/src/config/`, `backend/src/services/`)** — configuration, Redis, and email clients.

Controllers, middleware, schedulers, and workers use repository instances rather than importing Mongoose models directly. Replaceable dependencies for the server lifecycle are passed to `ApiServer` in tests.

## Frontend layers

- `src/api/api.js` is the shared Axios client and API base URL boundary.
- `src/api/authApi.js` groups authentication calls.
- `src/context/` owns authentication state and the `useAuth` hook.
- `src/features/*/hooks/` owns API-driven feature state.
- `src/features/*/components/` renders feature UI.

## Startup and shutdown

`backend/server.js` imports the module-scoped `ApiServer` singleton. `start()` is idempotent while running and shares an in-flight startup promise. Startup order is MongoDB, scrape worker, cron scheduler, feed sync loop, then HTTP listener. `stop()` clears the loop and closes the listener, scheduler, queue, and MongoDB connection.

## Container deployment

`compose.yaml` orchestrates four services: Nginx-hosted React frontend, Node/Python backend, MongoDB, and Redis. MongoDB and Redis use named persistent volumes and health checks; the backend waits for both before starting. The frontend is served on port 8080, the API on 3000, and data-service ports bind to localhost only.

## API areas

- `/api/v1/auth` — registration verification, two-step login, session management, and password recovery endpoints.
- `/api/v1/scrape` — authenticated Amazon, Indeed, and Booking query endpoints.
- `/api/v1/results` — authenticated saved-result search, filters, and pagination.
- `/api/v1/notifications` — authenticated job-notification preferences.
- `/api/v1/presets` — authenticated saved-search CRUD and queue launch.
- `/api/v1/feeds` — authenticated feed-source status and rate-limited manual refresh.
- `/api/v1/dashboard` — telemetry, queue history/control, and user-owned scrape schedules.
- `/api/v1/feed` — persisted categorized feed results.
- `/health` — process-level HTTP health response.

## Test boundaries

- **Unit:** middleware, utilities, repository adapter, server lifecycle, and model validation.
- **Integration:** Express routes with in-memory MongoDB and mocked external adapters.
- **HTTP end-to-end:** starts a real ephemeral HTTP listener and exercises `/health`.

The Python scripts and real provider connectivity are not covered by automated end-to-end tests.

Saved scraper records carry an owner ID through both one-off requests and scheduled worker jobs. The Results API filters scraper collections by that ID; feed entries remain shared content.
